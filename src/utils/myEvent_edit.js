import { route } from "preact-router";
import { setDBItem } from "./IndexedDB.js";

/**
 * 解析最旧 trigger 的 basis 内容
 */
export function parseOldestBasis(basisText) {
    let initial = "";
    let volatility = "";
    if (!basisText) return { initial, volatility };

    const initialTag = "[INITIAL PROBABILITY CONFIGURATION]:";
    const volatilityTag = "[NEWS VOLATILITY FACTOR]:";

    const initialIdx = basisText.indexOf(initialTag);
    const volatilityIdx = basisText.indexOf(volatilityTag);

    if (initialIdx !== -1 && volatilityIdx !== -1) {
        if (initialIdx < volatilityIdx) {
            initial = basisText.substring(initialIdx + initialTag.length, volatilityIdx).trim();
            volatility = basisText.substring(volatilityIdx + volatilityTag.length).trim();
        } else {
            volatility = basisText.substring(volatilityIdx + volatilityTag.length, initialIdx).trim();
            initial = basisText.substring(initialIdx + initialTag.length).trim();
        }
    } else {
        // 如果没有匹配到固定标签，默认填入第一个
        initial = basisText;
    }

    return { initial, volatility };
}

/**
 * 处理触发器的编辑点击事件
 */
export async function handleTriggerEdit(item, t) {
    // 找出所有触发器中最旧的一条（按 date 升序排列）
    const sorted = [...(item.triggers || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
    const oldestTrigger = sorted[0];
    
    // 判断当前点击的是否为最旧的一条
    const isOldest = oldestTrigger && t.date === oldestTrigger.date && t.text === oldestTrigger.text;

    let editData = {
        isOldest,
        propId: item.id,
        triggerId: t.id,
        text: t.text || "",
        url: t.url || "",
        date: t.date || "",
        title: "",
        baseProbability: "",
        basis1: "",
        basis2: "",
        dir: t.dir || "",
        pct: t.pct || ""
    };

    if (isOldest) {
        const { initial, volatility } = parseOldestBasis(t.basis);
        editData.title = item.title || "";
        editData.baseProbability = item.baseProbability || "";
        editData.basis1 = initial;
        editData.basis2 = volatility;
    } else {
        editData.basis2 = t.basis || ""; // 不是最旧的，填入模块二的 Basis
    }

    // 写入缓存并跳转
    await setDBItem("create.edit", editData);

    route("/create?mode=edit");
}