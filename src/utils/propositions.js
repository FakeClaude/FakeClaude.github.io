import { db } from "./firebase.js";
// import {
//   collection, doc, getDoc, getDocs,
//   addDoc, updateDoc, deleteDoc,
//   query, orderBy, where, limit, startAfter,
//   serverTimestamp
// } from "firebase/firestore";
import {
  collection, doc, getDoc, getDocs,
  addDoc, updateDoc, deleteDoc,
  query, orderBy, where, limit, startAfter,
  serverTimestamp
} from "./firebaseLogger.js";
import { getCurrentUser } from "./auth.js";
import { getPropositionsCache, setPropositionsCache, getLastSyncAt, setLastSyncAt } from "./IndexedDB.js";

// 全局通用准则：数据加工还原函数
export function toSerializable(list) {
  if (!Array.isArray(list)) return [];
  return list.map(item => {
    const clone = { ...item };
    delete clone._triggerLastDoc; // 移除不可克隆的 DocumentSnapshot
    return clone;
  });
}
export function restoreTrendCache(prop) {
  if (!prop) return prop;

  const baseProbability = prop.baseProbability || 0;

  if (!Array.isArray(prop.trendCache) || prop.trendCache.length === 0) {
    return { ...prop, trendPoints: [baseProbability], realizedDeltas: [], currentProb: baseProbability };
  }

  const decompressed = prop.trendCache.map(item => ({
    dir: item.d === 1 ? "up" : "down",
    pct: (item.p || 0) / 10
  }));

  const { points, realizedDeltas } = buildBayesianChain(baseProbability, decompressed);

  return {
    ...prop,
    trendPoints: points,
    realizedDeltas: realizedDeltas.slice().reverse(), // 转成新→旧，匹配 triggers 显示顺序
    currentProb: points[points.length - 1]
  };
}

//底层统一 Trigger 拉取函数
async function fetchTriggers(propId, fetchLimit, afterDoc = null) {
  let q = query(
    collection(db, "propositions", propId, "triggers"),
    orderBy("date", "desc"),
    limit(fetchLimit)
  );
  if (afterDoc) q = query(q, startAfter(afterDoc));
  const snap = await getDocs(q);
  return {
    triggers: snap.docs.map(d => ({ id: d.id, ...d.data() })),
    lastDoc: snap.docs[snap.docs.length - 1] || null,
    empty: snap.empty
  };
}

async function executeIncrementalSync(sortBy, cachedList) {
  const lastSyncAt = await getLastSyncAt(sortBy);
  if (lastSyncAt === 0) return { skipped: true }; // 首次访问，走全量

  const changedSnap = await getDocs(
    query(
      collection(db, "propositions"),
      where("updatedAt", ">", new Date(lastSyncAt)),
      orderBy("updatedAt", "asc"),
      limit(50)
    )
  );

  await setLastSyncAt(sortBy, Date.now());

  if (changedSnap.empty) {
    return { unchanged: true, list: cachedList };
  }

  const cacheMap = new Map(cachedList.map(p => [p.id, p]));

  const changedProps = await Promise.all(
    changedSnap.docs.map(async (propDoc) => {
      const prop = { id: propDoc.id, ...propDoc.data() };
      const cached = cacheMap.get(prop.id);
      const { triggers, lastDoc } = await fetchTriggers(prop.id, 3);
      // 保留本地已加载的更多 triggers
      if (cached?.triggers?.length > triggers.length) {
        prop.triggers = cached.triggers;
        prop._triggerLastDoc = cached._triggerLastDoc;
      } else {
        prop.triggers = triggers;
        prop._triggerLastDoc = lastDoc;
      }
      return restoreTrendCache(prop);
    })
  );

  const changedMap = new Map(changedProps.map(p => [p.id, p]));

  // 更新已有项 + 追加新命题
  const merged = cachedList.map(p => changedMap.has(p.id) ? changedMap.get(p.id) : p);
  for (const [id, prop] of changedMap) {
    if (!cacheMap.has(id)) merged.push(prop);
  }

  // 按 sortBy 重新排序
  if (sortBy === "new") {
    merged.sort((a, b) => (b.latestTriggerDate ?? "") > (a.latestTriggerDate ?? "") ? 1 : -1);
  } else {
    merged.sort((a, b) => (b.follow ?? 0) - (a.follow ?? 0));
  }

  await setPropositionsCache(toSerializable(merged), sortBy);
  return { unchanged: false, list: merged };
}

// 1️⃣ 阶段一：首屏冷启动流水线
export async function startLoadingPipeline(setPropositions, setLoading, sortBy = "best") {
  let cachedData = null;
  try {
    cachedData = await getPropositionsCache(sortBy);
    if (cachedData?.length > 0) {
      const restoredCache = cachedData.map(restoreTrendCache);
      setPropositions(restoredCache);
      if (setLoading) setLoading(false);
    }
  } catch (e) {
    console.warn("读取 IDB 失败:", e);
  }

  // ─── 增量同步路径（有缓存时）───────────────────────────
  if (cachedData?.length > 0) {
    try {
      const restoredCache = cachedData.map(restoreTrendCache);
      const result = await executeIncrementalSync(sortBy, restoredCache);

      if (!result.skipped) {
        // 有变化时更新视图；无变化时缓存已是最新，不需要 setPropositions
        if (!result.unchanged) setPropositions(result.list);
        if (setLoading) setLoading(false);

        const realProps = result.list.filter(p => !p.isSkeleton);
        return {
          currentList: result.list,
          lastPropDoc: null,
          lastPropId: realProps[realProps.length - 1]?.id || null,
          noMoreProps: false,
          sortBy,
          cacheHit: true,
        };
      }
    } catch (e) {
      console.warn("增量同步失败，降级全量:", e);
    }
  }

  // ─── 全量拉取路径（冷启动 / 增量失败 / 首次访问）────────
  try {
    const propSnap = await getDocs(
      query(
        collection(db, "propositions"),
        orderBy(sortBy === "new" ? "latestTriggerDate" : "follow", "desc"),
        limit(4)
      )
    );

    const networkProps = await Promise.all(
      propSnap.docs.map(async (propDoc) => {
        const prop = { id: propDoc.id, ...propDoc.data() };
        const { triggers, lastDoc } = await fetchTriggers(prop.id, 3);
        prop.triggers = triggers;
        prop._triggerLastDoc = lastDoc;
        return restoreTrendCache(prop);
      })
    );

    let mergedList = networkProps;
    if (cachedData?.length > 0) {
      const cacheMap = new Map(cachedData.map(p => [p.id, p]));
      mergedList = networkProps.map(networkProp => {
        const cached = cacheMap.get(networkProp.id);
        if (cached?.triggers?.length > networkProp.triggers.length) {
          return { ...networkProp, triggers: cached.triggers, _triggerLastDoc: cached._triggerLastDoc };
        }
        return networkProp;
      });
      const networkIds = new Set(networkProps.map(p => p.id));
      const localRest = cachedData.filter(p => !networkIds.has(p.id)).map(restoreTrendCache);
      mergedList = [...mergedList, ...localRest];
    }

    setPropositions(mergedList);
    if (setLoading) setLoading(false);
    await setPropositionsCache(toSerializable(mergedList), sortBy);
    await setLastSyncAt(sortBy, Date.now()); // ← 新增：全量后记录同步时间

    return {
      currentList: mergedList,
      lastPropDoc: propSnap.docs[propSnap.docs.length - 1] || null,
      noMoreProps: propSnap.docs.length < 4,
      sortBy,
    };
  } catch (error) {
    if (setLoading) setLoading(false);
    console.error("❌ 阶段一失败:", error);
    throw error;
  }
}

// 2️⃣ 阶段二：首屏后台静默补全至 13 条
export async function executeStage2(context, setPropositions) {
  const { currentList } = context;
  if (!currentList || currentList.length === 0) return context;

  const first4 = currentList.slice(0, 4);
  const rest = currentList.slice(4);

  const updatedFirst4 = await Promise.all(
    first4.map(async (prop) => {
      const alreadyHave = prop.triggers?.length || 0;
      const total = prop.triggerCount || 0;

      if ((alreadyHave >= total && total > 0) || alreadyHave >= 13) return prop;

      const need = 13 - alreadyHave;
      const { triggers: moreTriggers, lastDoc } = await fetchTriggers(prop.id, need, prop._triggerLastDoc);

      return {
        ...prop,
        triggers: [...(prop.triggers || []), ...moreTriggers],
        _triggerLastDoc: lastDoc || prop._triggerLastDoc
      };
    })
  );

  const finalList = [...updatedFirst4, ...rest];
  setPropositions(finalList);
  await setPropositionsCache(toSerializable(finalList), context.sortBy);

  return { ...context, currentList: finalList };
}

// 3️⃣ 阶段三：次屏后台静默预加载（5~12 条及 13 条 triggers）
export async function executeStage3(context, setPropositions) {
  const { currentList, lastPropDoc, noMoreProps, sortBy = "best" } = context;
  if (noMoreProps || !lastPropDoc) return context;

  try {
    const nextSnap = await getDocs(
      query(
        collection(db, "propositions"),
        orderBy(sortBy === "new" ? "latestTriggerDate" : "follow", "desc"),
        startAfter(lastPropDoc),
        limit(8)
      )
    );

    if (nextSnap.empty) return { ...context, noMoreProps: true };

    const cacheMap = new Map(currentList.map(p => [p.id, p]));

    const nextProps = await Promise.all(
      nextSnap.docs.map(async (propDoc) => {
        const id = propDoc.id;
        const prop = { id, ...propDoc.data() };

        if (cacheMap.has(id)) {
          const cached = cacheMap.get(id);
          if (cached.triggers && cached.triggers.length >= 13) {
            return restoreTrendCache(cached);
          }
        }

        const { triggers, lastDoc } = await fetchTriggers(prop.id, 13);
        prop.triggers = triggers;
        prop._triggerLastDoc = lastDoc;
        return restoreTrendCache(prop);
      })
    );

    const nextMap = new Map(nextProps.map(p => [p.id, p]));
    const updatedList = currentList.map(item => {
      if (nextMap.has(item.id)) {
        const updated = nextMap.get(item.id);
        nextMap.delete(item.id);
        return updated;
      }
      return item;
    });
    if (nextMap.size > 0) updatedList.push(...nextMap.values());

    setPropositions(updatedList);
    await setPropositionsCache(toSerializable(updatedList), sortBy);

    return {
      ...context,
      currentList: updatedList,
      lastPropDoc: nextSnap.docs[nextSnap.docs.length - 1] || null,
      noMoreProps: nextSnap.docs.length < 8
    };
  } catch (error) {
    console.error("❌ 阶段三失败:", error);
    throw error;
  }
}

// 4️⃣ 阶段四：过客占位（向后兼容 home.jsx 的顺序调用）
export async function executeStage4(context, setPropositions) {
  return context;
}

// 5️⃣ 阶段五：点击卡片展开与右侧滚动缓冲机制
export async function ensureTriggersForExpand(prop) {
  if (prop.noMoreTriggers) return prop;

  const alreadyHave = prop.triggers?.length || 0;
  const total = prop.triggerCount || 0;

  if (total > 0 && alreadyHave >= total) {
    return { ...prop, noMoreTriggers: true };
  }
  if (alreadyHave >= 14 && prop._triggerLastDoc) return prop;

  const { triggers: allTriggers, lastDoc } = await fetchTriggers(prop.id, 14);
  const noMore = allTriggers.length < 14 || (total > 0 && allTriggers.length >= total);

  return { ...prop, triggers: allTriggers, _triggerLastDoc: lastDoc, noMoreTriggers: noMore };
}

export async function fetchMoreTriggersForScroll(prop, visibleLastIdx) {
  if (prop.noMoreTriggers) return null;

  const realTriggers = (prop.triggers || []).filter(t => !t.isSkeleton);
const alreadyHave  = realTriggers.length;
  const total = prop.triggerCount || 0;
  const needed = visibleLastIdx + 10 + 1;

  if (total > 0 && alreadyHave >= total) {
  return { ...prop, triggers: realTriggers, noMoreTriggers: true };
}
  if (alreadyHave >= needed) return null;

  const fetchCount = needed - alreadyHave;
const { triggers: newTriggers, lastDoc, empty } = await fetchTriggers(
  prop.id,
  fetchCount,
  prop._triggerLastDoc ?? null
);

if (empty || newTriggers.length === 0) {
  return { ...prop, triggers: realTriggers, noMoreTriggers: true };
}
const merged = [...realTriggers, ...newTriggers];
const noMore = newTriggers.length < fetchCount || (total > 0 && merged.length >= total);
return {
  ...prop,
  triggers: merged,
  _triggerLastDoc: lastDoc ?? prop._triggerLastDoc,
  noMoreTriggers: noMore,
};
}

// 6️⃣ 阶段六：主页无限滚动预加载
export async function executeStage6(context, setPropositions) {
  let { currentList, lastPropDoc, lastPropId, noMoreProps, sortBy = "best" } = context;
  if (noMoreProps) return context;

  // 增量同步路径没有 lastPropDoc，用 lastPropId 懒加载游标（1次读取）
  if (!lastPropDoc && lastPropId) {
    try {
      const snap = await getDoc(doc(db, "propositions", lastPropId));
      if (!snap.exists()) return { ...context, noMoreProps: true };
      lastPropDoc = snap;
    } catch {
      return { ...context, noMoreProps: true };
    }
  }

  if (!lastPropDoc) return context;

  try {
    const nextSnap = await getDocs(
      query(
        collection(db, "propositions"),
        orderBy(sortBy === "new" ? "latestTriggerDate" : "follow", "desc"),
        startAfter(lastPropDoc),
        limit(8)
      )
    );

    if (nextSnap.empty) return { ...context, noMoreProps: true };

    const cacheMap = new Map(currentList.map(p => [p.id, p]));

    const nextProps = await Promise.all(
      nextSnap.docs.map(async (propDoc) => {
        const id = propDoc.id;
        if (cacheMap.has(id)) {
          const cached = cacheMap.get(id);
          if (cached.triggers && cached.triggers.length > 0) {
            return cached;
          }
        }

        const prop = { id, ...propDoc.data() };
        const restored = restoreTrendCache(prop);
        const { triggers } = await fetchTriggers(restored.id, 3);
        restored.triggers = triggers;
        return restored;
      })
    );

    const nextMap = new Map(nextProps.map(p => [p.id, p]));
    const updatedList = currentList.map(item => {
      if (nextMap.has(item.id)) {
        const updated = nextMap.get(item.id);
        nextMap.delete(item.id);
        return updated;
      }
      return item;
    });
    if (nextMap.size > 0) updatedList.push(...nextMap.values());

    setPropositions(updatedList);
    await setPropositionsCache(toSerializable(updatedList), sortBy);

    return {
      ...context,
      currentList: updatedList,
      lastPropDoc: nextSnap.docs[nextSnap.docs.length - 1] || null,
      noMoreProps: nextSnap.docs.length < 8
    };
  } catch (error) {
    console.error("❌ 阶段六失败:", error);
    throw error;
  }
}

// Following：follow/unfollow 写 Firestore
export async function followProposition(propId) {
  const ref = doc(db, "propositions", propId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Proposition not found");
  await updateDoc(ref, {
    follow: (snap.data().follow || 0) + 1,
    updatedAt: serverTimestamp(), // ← 新增
  });
}

export async function unfollowProposition(propId) {
  const ref = doc(db, "propositions", propId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Proposition not found");
  await updateDoc(ref, {
    follow: Math.max(0, (snap.data().follow || 0) - 1),
    updatedAt: serverTimestamp(), // ← 新增
  });
}

// Following：following 页面数据加载
export async function loadFollowingPage(setPropositions, setLoading) {
  const { getFollowingCache, setFollowingCache } = await import("./IndexedDB.js");

  const cached = await getFollowingCache();
  if (cached && cached.length > 0) {
    setPropositions(cached.map(restoreTrendCache));
    if (setLoading) setLoading(false);
  } else {
    if (setLoading) setLoading(false);
    return;
  }

  // 增量同步：与 best/new 一致
  try {
    const lastSyncAt = await getLastSyncAt("following");
    if (lastSyncAt > 0) {
      const followedIds = new Set(cached.map(p => p.id));
      const changedSnap = await getDocs(
        query(
          collection(db, "propositions"),
          where("updatedAt", ">", new Date(lastSyncAt)),
          orderBy("updatedAt", "asc"),
          limit(50)
        )
      );
      await setLastSyncAt("following", Date.now());

      if (changedSnap.empty) return; // 无变化，直接用缓存

      const changedInFollowing = changedSnap.docs.filter(d => followedIds.has(d.id));
      if (changedInFollowing.length === 0) return;

      const cacheMap = new Map(cached.map(p => [p.id, p]));
      const updatedProps = await Promise.all(
        changedInFollowing.map(async (propDoc) => {
          const orig = cacheMap.get(propDoc.id);
          const prop = { id: propDoc.id, ...propDoc.data(), followedAt: orig?.followedAt };
          const { triggers, lastDoc } = await fetchTriggers(prop.id, Math.max(3, orig?.triggers?.length || 0));
          prop.triggers = triggers.length >= (orig?.triggers?.length || 0) ? triggers : orig.triggers;
          prop._triggerLastDoc = lastDoc;
          return restoreTrendCache(prop);
        })
      );

      const updatedMap = new Map(updatedProps.map(p => [p.id, p]));
      const updatedList = cached.map(p => updatedMap.has(p.id) ? updatedMap.get(p.id) : restoreTrendCache(p));
      updatedList.sort((a, b) => b.followedAt - a.followedAt);
      setPropositions(updatedList);
      await setFollowingCache(toSerializable(updatedList));
      return;
    }
  } catch (e) {
    console.warn("following 增量同步失败，降级全量:", e);
  }

  // 首次（lastSyncAt === 0）：全量更新
  await setLastSyncAt("following", Date.now());
  try {
    const updated = await Promise.all(
      cached.map(async (prop) => {
        const snap = await getDoc(doc(db, "propositions", prop.id));
        if (!snap.exists()) return prop;
        const fresh = { id: prop.id, ...snap.data(), followedAt: prop.followedAt };
        const { triggers, lastDoc } = await fetchTriggers(fresh.id, 13);
        fresh.triggers = triggers;
        fresh._triggerLastDoc = lastDoc;
        return restoreTrendCache(fresh);
      })
    );
    const latestCached = await getFollowingCache();
    const latestIds = new Set((latestCached || []).map(p => p.id));
    const filteredUpdated = updated.filter(p => latestIds.has(p.id));
    filteredUpdated.sort((a, b) => b.followedAt - a.followedAt);
    setPropositions(filteredUpdated);
    await setFollowingCache(toSerializable(filteredUpdated));
  } catch (err) {
    console.error("❌ following 页面全量更新失败:", err);
  }
}

// 基础 CRUD
export async function getTriggers(propositionId, pageSize = 20, lastDoc = null) {
  const result = await fetchTriggers(propositionId, pageSize, lastDoc);
  return { triggers: result.triggers, lastDoc: result.lastDoc };
}

export async function getTriggerBasis(propositionId, triggerId) {
  const snap = await getDoc(
    doc(db, "propositions", propositionId, "triggers", triggerId)
  );
  return snap.exists() ? snap.data().basis : null;
}

export async function addTrigger(propositionId, triggerData, authorId) {
  const ref = await addDoc(
    collection(db, "propositions", propositionId, "triggers"),
    { ...triggerData, authorId, createdAt: serverTimestamp() }
  );
  if (triggerData.date) {
    await updateDoc(doc(db, "propositions", propositionId), {
      latestTriggerDate: triggerData.date,
      updatedAt: serverTimestamp(),
    });
  }
  return ref;
}

export async function updateTrigger(propositionId, triggerId, triggerData, authorId) {
  const ref = doc(db, "propositions", propositionId, "triggers", triggerId);
  const snap = await getDoc(ref);
  if (!snap.exists() || snap.data().authorId !== authorId) throw new Error("Unauthorized");
  await updateDoc(ref, triggerData);
  await updateDoc(doc(db, "propositions", propositionId), { updatedAt: serverTimestamp() });
}

export async function deleteTrigger(propositionId, triggerId, authorId) {
  const ref = doc(db, "propositions", propositionId, "triggers", triggerId);
  const snap = await getDoc(ref);
  if (!snap.exists() || snap.data().authorId !== authorId) throw new Error("Unauthorized");
  return await deleteDoc(ref);
}

export async function getProposition(propId) {
  const snap = await getDoc(doc(db, "propositions", propId));
  return snap.exists() ? snap.data() : null;
}

export async function deleteProposition(propId, creatorId) {
  const ref = doc(db, "propositions", propId);
  const snap = await getDoc(ref);
  if (!snap.exists() || snap.data().creatorId !== creatorId) throw new Error("Unauthorized");
  return await deleteDoc(ref);
}

export async function addProposition(propData, creatorId) {
  const ref = await addDoc(collection(db, "propositions"), {
    ...propData,
    creatorId,
    follow: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref;
}

export async function loadMyPropositions(setPropositions, setLoading) {
  const user = getCurrentUser();
  if (!user) { setLoading(false); return; }

  // 1. 读 IDB 缓存，有则立即渲染
  let cachedData = null;
  try {
    cachedData = await getPropositionsCache("myevents");
    if (cachedData?.length > 0) {
      setPropositions(cachedData.map(restoreTrendCache));
      if (setLoading) setLoading(false);
    }
  } catch (e) {
    console.warn("读取 MyEvents IDB 失败:", e);
  }

  // 2. 增量同步
  if (cachedData?.length > 0) {
    try {
      const lastSyncAt = await getLastSyncAt("myevents");
      if (lastSyncAt > 0) {
        const myIds = new Set(cachedData.map(p => p.id));
        const changedSnap = await getDocs(
          query(
            collection(db, "propositions"),
            where("updatedAt", ">", new Date(lastSyncAt)),
            orderBy("updatedAt", "asc"),
            limit(50)
          )
        );
        await setLastSyncAt("myevents", Date.now());

        if (changedSnap.empty) return;

        // 匹配已有的 + 新建的（creatorId === user.uid）
        const changedMine = changedSnap.docs.filter(d =>
          myIds.has(d.id) || d.data().creatorId === user.uid
        );
        if (changedMine.length === 0) return;

        const cacheMap = new Map(cachedData.map(p => [p.id, p]));
        const updatedProps = await Promise.all(
          changedMine.map(async (propDoc) => {
            const orig = cacheMap.get(propDoc.id);
            const prop = { id: propDoc.id, ...propDoc.data() };
            const { triggers, lastDoc } = await fetchTriggers(prop.id, Math.max(3, orig?.triggers?.length || 0));
            prop.triggers = triggers.length >= (orig?.triggers?.length || 0) ? triggers : orig.triggers;
            prop._triggerLastDoc = lastDoc;
            return restoreTrendCache(prop);
          })
        );

        const updatedMap = new Map(updatedProps.map(p => [p.id, p]));
        const updatedList = cachedData.map(p => updatedMap.has(p.id) ? updatedMap.get(p.id) : restoreTrendCache(p));
        // 追加新建的
        for (const [id, prop] of updatedMap) {
          if (!cacheMap.has(id)) updatedList.push(prop);
        }
        updatedList.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
        setPropositions(updatedList);
        await setPropositionsCache(toSerializable(updatedList), "myevents");
        return;
      }
    } catch (e) {
      console.warn("myevents 增量同步失败，降级全量:", e);
    }
  }

  // 3. 首次或增量失败：全量拉取
  if (setLoading) setLoading(false);
  await setLastSyncAt("myevents", Date.now());
  try {
    const snap = await getDocs(
      query(
        collection(db, "propositions"),
        where("creatorId", "==", user.uid),
        orderBy("createdAt", "desc")
      )
    );

    if (snap.empty) {
      setPropositions([]);
      await setPropositionsCache([], "myevents");
      return;
    }

    const networkProps = await Promise.all(
      snap.docs.map(async (propDoc) => {
        const prop = { id: propDoc.id, ...propDoc.data() };
        const { triggers, lastDoc } = await fetchTriggers(prop.id, 3);
        prop.triggers = triggers;
        prop._triggerLastDoc = lastDoc;
        return restoreTrendCache(prop);
      })
    );

    let mergedList = networkProps;
    if (cachedData?.length > 0) {
      const cacheMap = new Map(cachedData.map(p => [p.id, p]));
      mergedList = networkProps.map(np => {
        const cached = cacheMap.get(np.id);
        if (cached?.triggers?.length > np.triggers.length) {
          return { ...np, triggers: cached.triggers, _triggerLastDoc: cached._triggerLastDoc };
        }
        return np;
      });
    }

    setPropositions(mergedList);
    await setPropositionsCache(toSerializable(mergedList), "myevents");
    await executeStage2({ currentList: mergedList, sortBy: "myevents" }, setPropositions);
  } catch (err) {
    console.error("loadMyPropositions 失败:", err);
  }
}

export async function updateProposition(propId, data, creatorId) {
  const ref = doc(db, "propositions", propId);
  const snap = await getDoc(ref);
  if (!snap.exists() || snap.data().creatorId !== creatorId) throw new Error("Unauthorized");
  return await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

export async function rebuildTrendCache(propId) {
  const { triggers } = await getTriggers(propId, 500);
  const sorted = [...triggers].sort((a, b) => a.date > b.date ? 1 : -1);
  const trendCache = sorted.map(t => ({
    d: t.dir === "up" ? 1 : 0,
    p: Math.round(parseFloat(t.pct) * 10),
    t: parseInt(t.date.replace(/-/g, ""), 10)
  }));
  await updateDoc(doc(db, "propositions", propId), {
    trendCache,
    triggerCount: sorted.length,
    updatedAt: serverTimestamp(),
  });
}

export async function getOldestTriggers(propId, n = 2) {
  const snap = await getDocs(
    query(
      collection(db, "propositions", propId, "triggers"),
      orderBy("date", "asc"),
      limit(n)
    )
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}


export function calibrateLR(dir, pct) {
  const delta = dir === "down" ? -pct : pct;
  const target = Math.min(99.9, Math.max(0.1, 50 + delta));
  return target / (100 - target);
}

export function buildBayesianChain(baseProbability, orderedTriggersOldToNew) {
  let P = baseProbability; // 真实精确概率，继续参与后续每一步链式计算，逻辑不变
  let displayP = Number(P.toFixed(1)); // 上一步的"显示用"四舍五入值
  const points = [displayP];
  const realizedDeltas = [];

  orderedTriggersOldToNew.forEach(t => {
    const LR = calibrateLR(t.dir, parseFloat(t.pct));
    const oddsCurrent = P / (100 - P);
    const oddsNew = oddsCurrent * LR;
    const Pnew = 100 * oddsNew / (1 + oddsNew);

    let rounded = Number(Pnew.toFixed(1));
    let delta = Number((rounded - displayP).toFixed(1));

    // 只要真实发生了变化，哪怕四舍五入后是0.0%，也强制显示最小0.1%的可见变化
    if (delta === 0 && Pnew !== P) {
      const dir = Pnew > P ? 1 : -1;
      delta = Number((0.1 * dir).toFixed(1));
      rounded = Math.min(100, Math.max(0, Number((displayP + delta).toFixed(1))));
      delta = Number((rounded - displayP).toFixed(1)); // 钳制边界后重新对齐delta
    }

    realizedDeltas.push(delta);
    displayP = rounded;
    points.push(displayP);

    P = Pnew; // 真实概率不受显示层影响，继续按精确值参与下一轮计算
  });

  return { points, realizedDeltas };
}