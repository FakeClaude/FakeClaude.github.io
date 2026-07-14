//utils/create.jsx
import { h } from "preact";
import { route } from "preact-router";
import { useState, useEffect } from "preact/hooks";
import "./create.css";
import { getDBItem, setDBItem, setPropositionsCache } from "./IndexedDB.js";
import { addProposition, addTrigger, updateTrigger, updateProposition, getTriggers, rebuildTrendCache,getOldestTriggers, deleteTrigger, deleteProposition } from "./propositions.js";
import { parseOldestBasis } from "./myEvent_edit.js";
import { initAuth, getCurrentUser } from "./auth.js";
import {useTranslation} from "react-i18next";

export default function CreateEvent() {

    //region const
    async function handleAddTrigger(propId) {
    if (!relatedNews) return;

    const user = await initAuth();
    if (!user) return;

    setIsSubmitting(true);
    try {
        const dir = posValue ? "up" : "down";
        const pct = posValue || negValue;

        const { triggers: existingTriggers } = await getTriggers(propId, 100);
        const sorted = [...existingTriggers].sort((a, b) => new Date(a.date) - new Date(b.date));
        const currentOldest = sorted[0];

        let newBasis = basis2;

        if (currentOldest && occurredOn && occurredOn < currentOldest.date) {
            const { initial: oldInitial, volatility: oldVolatility } = parseOldestBasis(currentOldest.basis);
            newBasis = `[INITIAL PROBABILITY CONFIGURATION]:${oldInitial}[NEWS VOLATILITY FACTOR]:${basis2}`;
            await updateTrigger(propId, currentOldest.id, {
                basis: oldVolatility,
            }, user.uid);
        }

        await addTrigger(propId, {
            text: relatedNews,
            date: occurredOn,
            url: sourceLink,
            dir,
            pct,
            basis: newBasis,
        }, user.uid);

        await Promise.all([
            setDBItem(`create.add.${propId}`, null),
            rebuildTrendCache(propId)
        ]);
        route("/myevents");
    } catch (err) {
        console.error(err);
        setIsSubmitting(false);
    }
}
    async function handleEditTrigger() {
  const user = await initAuth();
  if (!user) return;
  if (!editPropId || !editTriggerId) return;

  setIsSubmitting(true);
  try {
      const dir = posValue ? "up" : "down";
      const pct = posValue || negValue;

      const oldestTwo = await getOldestTriggers(editPropId, 2);
      const currentOldest = oldestTwo[0];
      const secondOldest  = oldestTwo[1];

      const isCurrentOldest = currentOldest?.id === editTriggerId;
      const referenceDate   = isCurrentOldest ? secondOldest?.date : currentOldest?.date;
      const editedBecomesOldest = !referenceDate || occurredOn <= referenceDate;

      let basisForEdited;

      if (isCurrentOldest && editedBecomesOldest) {
        basisForEdited = `[INITIAL PROBABILITY CONFIGURATION]:${basis1}[NEWS VOLATILITY FACTOR]:${basis2}`;
      } else if (isCurrentOldest && !editedBecomesOldest) {
        basisForEdited = basis2;
        const { volatility: targetVolatility } = parseOldestBasis(secondOldest.basis);
        await updateTrigger(editPropId, secondOldest.id, {
          basis: `[INITIAL PROBABILITY CONFIGURATION]:${basis1}[NEWS VOLATILITY FACTOR]:${targetVolatility}`,
        }, user.uid);
      } else if (!isCurrentOldest && editedBecomesOldest) {
        const { initial: oldInitial, volatility: oldVolatility } = parseOldestBasis(currentOldest.basis);
        basisForEdited = `[INITIAL PROBABILITY CONFIGURATION]:${oldInitial}[NEWS VOLATILITY FACTOR]:${basis2}`;
        await updateTrigger(editPropId, currentOldest.id, {
          basis: oldVolatility,
        }, user.uid);
      } else {
        basisForEdited = basis2;
      }

      await updateTrigger(editPropId, editTriggerId, {
        text: relatedNews,
        date: occurredOn,
        url: sourceLink,
        dir,
        pct,
        basis: basisForEdited,
      }, user.uid);

      if (isCurrentOldest && editedBecomesOldest) {
        await updateProposition(editPropId, {
          title: eventTitle,
          baseProbability: parseFloat(baseProb),
        }, user.uid);
      }

      await Promise.all([
          setDBItem("create.edit", null),
          rebuildTrendCache(editPropId)
      ]);
      route("/myevents");
  } catch (err) {
      console.error(err);
      setIsSubmitting(false);
  }
}
    async function handleDelete() {
        if (isSubmitting || isDeleting) return; // 阻止重复提交

        const confirmMsg = isOldest
        ? t('create.Are you sure you want to delete this proposition and all news?')
        : t('create.Are you sure you want to delete this news?');
        if (!window.confirm(confirmMsg)) return;

        setIsDeleting(true); // 使用独立的删除状态
        try {
            const user = await initAuth();
            if (!user) {
                setIsDeleting(false);
                return;
            }

            if (isOldest) {
                await deleteProposition(editPropId, user.uid);
            } else {
                await deleteTrigger(editPropId, editTriggerId, user.uid);
                await rebuildTrendCache(editPropId);
            }

            await Promise.all([
                (!isOldest ? rebuildTrendCache(editPropId) : Promise.resolve()),
                setDBItem("create.edit", null),
                setPropositionsCache([], "best"),
                setPropositionsCache([], "new"),
                setPropositionsCache([], "myevents")
            ]);

            route("/myevents");
        } catch (err) {
            console.error(err);
            setIsDeleting(false);
        }
    }
    async function handleConfirm() {
        if (!eventTitle || !relatedNews) return;

        const user = await initAuth();
        if (!user) return;

        setIsSubmitting(true);
        try {
            const dir = posValue ? "up" : "down";
            const pct = posValue || negValue;

            const mergedBasis = `[INITIAL PROBABILITY CONFIGURATION]:${basis1}[NEWS VOLATILITY FACTOR]:${basis2}`;

            const trendCache = occurredOn ? [{
                d: dir === "up" ? 1 : 0,
                p: Math.round(parseFloat(pct) * 10),
                t: parseInt(occurredOn.replace(/-/g, ""), 10)
            }] : [];

            const propRef = await addProposition({
                title: eventTitle,
                baseProbability: parseFloat(baseProb),
                triggerCount: 1,
                latestTriggerDate: occurredOn,
                trendCache,
            }, user.uid);

            await addTrigger(propRef.id, {
                text: relatedNews,
                date: occurredOn,
                url: sourceLink,
                dir,
                pct,
                basis: mergedBasis,
            }, user.uid);

            await Promise.all([
            setPropositionsCache([], "best"),
            setPropositionsCache([], "new"),
            setDBItem("create.createevent", null)
        ]);

            route("/myevents");
        } catch (err) {
            console.error(err);
            setIsSubmitting(false);
        }
    }
    const {t} = useTranslation();
    function autoGrow(e) {
        const el = e.target;
        el.style.height = "auto";
        el.style.height = el.scrollHeight + "px";
    }
    function normalizePct(value) {
        // 只保留数字和 .
        value = value.replace(/[^\d.]/g, "");

        // 只允许一个 .
        const parts = value.split(".");
        if (parts.length > 2) {
            value = parts[0] + "." + parts.slice(1).join("");
        }

        // 最多 1 位小数
        const match = value.match(/^\d+(\.\d?)?/);
        value = match ? match[0] : "";

        // 限制 0~100
        const num = Number(value);
        if (value && !Number.isNaN(num)) {
            if (num > 100) value = "100";
            if (num > 0 && num < 0.1) value = "0.1";
        }

        return value;
    }
    const [editPropId, setEditPropId] = useState('');
    const [editTriggerId, setEditTriggerId] = useState('');
    const [showDate, setShowDate] = useState(false);
    const [posValue, setPosValue] = useState('');
    const [isBayesian, setIsBayesian] = useState(false);
    const [bayesianYes, setBayesianYes] = useState('');
    const [bayesianNo, setBayesianNo] = useState('');
    const [negValue, setNegValue] = useState('');
    const [isEdit, setIsEdit] = useState(false);
    const [isOldest, setIsOldest] = useState(true);
    const [eventTitle, setEventTitle] = useState('');
    const [baseProb, setBaseProb] = useState('');
    const [basis1, setBasis1] = useState('');
    const [relatedNews, setRelatedNews] = useState('');
    const [occurredOn, setOccurredOn] = useState('');
    const [sourceLink, setSourceLink] = useState('');
    const [basis2, setBasis2] = useState('');
    const [isReady, setIsReady] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    useEffect(() => {
    async function initForm() {
      // 解析 URL 参数
      const params = new URLSearchParams(window.location.search);
      const mode = params.get("mode");
      const id = params.get("id");

      const isEditMode = mode === "edit";
      const isAddMode = mode === "add";
      // add 模式与 edit 模式一样，不展示免责声明并应用相同的按钮布局
      setIsEdit(isEditMode || isAddMode);

      // 核心：根据模式与 id 动态生成隔离的缓存键名
      let cacheKey = "create.createevent";
      if (isEditMode) {
        cacheKey = "create.edit";
      } else if (isAddMode && id) {
        cacheKey = `create.add.${id}`;
      }

      const data = await getDBItem(cacheKey);

      if (data) {
        // mode 为 add 时强制不带模块一
        setIsOldest(isAddMode ? false : (data.isOldest ?? true));
        setEventTitle(data.title || '');
        setBaseProb(data.baseProbability || '');
        setBasis1(data.basis1 || '');
        setRelatedNews(data.text || '');
        setOccurredOn(data.date || '');
        setSourceLink(data.url || '');
        setBasis2(data.basis2 || '');
        setEditPropId(data.propId || '');
        setEditTriggerId(data.triggerId || '');

        if (data.posValue !== undefined || data.negValue !== undefined) {
          setPosValue(data.posValue || '');
          setNegValue(data.negValue || '');
        } else {
          if (data.dir === "up") {
            setPosValue(data.pct || '');
            setNegValue('');
          } else if (data.dir === "down") {
            setNegValue(data.pct || '');
            setPosValue('');
          }
        }

        setIsBayesian(data.isBayesian ?? false);
        setBayesianYes(data.bayesianYes || '');
        setBayesianNo(data.bayesianNo || '');

        setTimeout(() => {
          document.querySelectorAll('.create-input-high').forEach(el => {
            el.style.height = "auto";
            el.style.height = el.scrollHeight + "px";
          });
        }, 0);
      } else {
        // 无缓存数据时，若为 add 模式也必须强制关闭模块一
        if (isAddMode) {
          setIsOldest(false);
        }
      }
      setIsReady(true);
    }
    initForm().catch(console.error);
  }, []);
    useEffect(() => {
    if (!isReady) return;

    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    const id = params.get("id");

    // 核心：同步变动保存时的键名划分逻辑
    let cacheKey = "create.createevent";
    if (mode === "edit") {
      cacheKey = "create.edit";
    } else if (mode === "add" && id) {
      cacheKey = `create.add.${id}`;
    }

      const formData = {
          isOldest,
          propId: editPropId,
          triggerId: editTriggerId,
          title: eventTitle,
          baseProbability: baseProb,
          basis1,
          text: relatedNews,
          date: occurredOn,
          url: sourceLink,
          basis2,
          posValue,
          negValue,
          isBayesian,
          bayesianYes,
          bayesianNo
      };

    setDBItem(cacheKey, formData).catch(console.error);
  }, [eventTitle, baseProb, basis1, relatedNews, occurredOn, sourceLink, basis2, posValue, negValue, isOldest, isReady, editPropId, editTriggerId, isBayesian, bayesianYes, bayesianNo]);
    useEffect(() => {
        if (!isBayesian || !bayesianYes || !bayesianNo) return;

        const pYes = parseFloat(bayesianYes) / 100;
        const pNo = parseFloat(bayesianNo) / 100;
        if (pNo === 0 || Number.isNaN(pYes) || Number.isNaN(pNo)) return;

        const lr = pYes / pNo;
        const priorProb = (parseFloat(baseProb) || 50) / 100;
        if (priorProb <= 0 || priorProb >= 1) return;

        const priorOdds = priorProb / (1 - priorProb);
        const postOdds = priorOdds * lr;
        const postProb = postOdds / (1 + postOdds);

        const delta = (postProb - priorProb) * 100;

        if (delta >= 0) {
            setPosValue(delta.toFixed(1));
            setNegValue('');
        } else {
            setNegValue(Math.abs(delta).toFixed(1));
            setPosValue('');
        }
    }, [bayesianYes, bayesianNo, baseProb, isBayesian]);
    //endregion

  return (
    <div className="create-wrapper">
        <div className="create" >

            {/* 模块一：Event */}
            {isOldest && (
                <div className="create-block" >
            <textarea
                className="create-input create-input-high"
                placeholder={t('create.Event')}
                value={eventTitle}
                onInput={(e) => {
                    setEventTitle(e.target.value);
                    autoGrow(e);
                }}
            />
                    <div className="create-divider" />
                    <div className="create-pct-wrapper" >
                        <input
                            className="create-input create-input-num"
                            placeholder={t('create.Base Probability')}
                            value={baseProb}
                            onInput={(e) => setBaseProb(normalizePct(e.target.value))
                        }
                        />
                        <span className="create-pct-suffix" >%</span >
                    </div >
                    <div className="create-divider" />
                    <textarea
                        className="create-input create-input-high"
                        placeholder={t('nav.Basis')}
                        value={basis1}
                        onInput={(e) => {
                            setBasis1(e.target.value);
                            autoGrow(e);
                        }}
                    />
                </div >
            )}

            {/* 模块二：News */}
            <div className="create-block" >
          <textarea
              className="create-input create-input-high"
              placeholder={t('create.Related News')}
              value={relatedNews}
              onInput={(e) => {
                  setRelatedNews(e.target.value);
                  autoGrow(e);
              }}
          />
                <div className="create-divider" />
                <div className="create-pct-wrapper" style={{position: 'relative'}} >

                    <input
                        type={showDate ? "date" : "text"}
                        className="create-input"
                        placeholder={t('create.Occurred On')}
                        value={occurredOn}
                        onFocus={(e) => {
                            setShowDate(true);
                            e.target.showPicker?.();
                        }}
                        onBlur={() => setShowDate(false)}
                        onInput={(e) => setOccurredOn(e.target.value)}
                    />
                    <span
                        className={`card-change-basis-icon ${showDate ? 'card-change-basis-icon--flipped' : ''}`}
                        onClick={() => setShowDate(s => !s)}
                    />
                </div >

                <div className="create-divider" />

                <input
                    className="create-input"
                    placeholder={t('create.Source Link')}
                    value={sourceLink}
                    onInput={(e) => setSourceLink(e.target.value)}
                />
                <div className="create-divider" />
               <div className="create-input-row" >
                    {!isBayesian ? (
                        <>
                            <div className="create-pct-wrapper" style={{flex: 1}} >
                                <input
                                    className="create-input create-input-num pct-pos"
                                    placeholder={t('create.Positive')}
                                    value={posValue}
                                    onInput={(e) => {
                                        const value = normalizePct(e.target.value);
                                        setPosValue(value);
                                        if (value) setNegValue('');
                                    }}
                                />
                                <span className="create-pct-suffix pct-pos" >%</span >
                            </div >
                            <span className="create-input-split" >
                                 {t('create.or')}
                            </span >
                            <div className="create-pct-wrapper" style={{flex: 1}} >
                                <input
                                    className="create-input create-input-num pct-neg"
                                    placeholder={t('create.Negative')}
                                    value={negValue}
                                    onInput={(e) => {
                                        const value = normalizePct(e.target.value);
                                        setNegValue(value);
                                        if (value) setPosValue('');
                                    }}
                                />
                                <span className="create-pct-suffix pct-neg" >%</span >
                            </div >
                        </>
                   ) : (
                        <>
                            <div className="create-bayesian-col" style={{ flex: 1 }}>
                                <div className="create-pct-wrapper">
                                    <input
                                        className="create-input create-input-num"
                                        placeholder="P(N|E)"
                                        value={bayesianYes}
                                        onInput={(e) => {
                                            const value = normalizePct(e.target.value);
                                            setBayesianYes(value);
                                        }}
                                    />
                                    <span className="create-pct-suffix">%</span>
                                    <div className="create-tooltip">
                                        {t('create.Probability of this news if Event happens')}
                                    </div>
                                </div>
                            </div>

                            <div className="create-bayesian-col" style={{ flex: 1 }}>
                                <div className="create-pct-wrapper">
                                    <input
                                        className="create-input create-input-num"
                                        placeholder="P(N|¬E)"
                                        value={bayesianNo}
                                        onInput={(e) => {
                                            const value = normalizePct(e.target.value);
                                            setBayesianNo(value);
                                        }}
                                    />
                                    <span className="create-pct-suffix">%</span>
                                    <div className="create-tooltip">
                                        {t('create.Probability of this news if Event doesn\'t happen')}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                    <button
                        type="button"
                        className="create-pct-switch"
                        onClick={() => setIsBayesian(!isBayesian)}
                    >
                        <div className="create-tooltip" >
                            {isBayesian ? t('create.Express Mode') : t('create.Bayesian Mode')}
                        </div >
                    </button >
                </div >
                <div className="create-divider" />
                <textarea
                    className="create-input create-input-high"
                    placeholder={t('nav.Basis')}
                    value={basis2}
                    onInput={(e) => {
                        setBasis2(e.target.value);
                        autoGrow(e);
                    }}
                />
            </div >

            {/* 免责声明 */}
            {!isEdit && (
                <div className="create-disclaimer" >
                    <div className="create-check-container" >
                        <input
                            type="checkbox"
                            className="create-check"
                            checked={agreed}
                            onChange={(e) => setAgreed(e.target.checked)}
                        />
                        <svg className="create-check-svg" viewBox="0 0 24 24" stroke-width="2" fill="none" >
                            <path d="m6 12 4 5 8-10" stroke="currentColor" />
                        </svg >
                    </div >
                    <a >{t('create.I agree to the')}{" "}
                        <span
                            className="create-underline"
                            style={{cursor: "pointer"}}
                            onClick={() => window.open("/disclaimer", "_blank", "noopener,noreferrer")}
                        >
                            {t('create.Disclaimer')}
                        </span >
                    </a >
                </div >
            )}

            {/* 提交 */}
            <div className={`create-button-wrapper ${isEdit ? 'create-button-wrapper--edit' : ''}`} >
                <button
                        className={`create-button ${isSubmitting ? 'create-button--loading' : ''}`}
                        disabled={isSubmitting || (!isEdit && !agreed)}
                        onClick={() => {
                            if (isSubmitting) return;
                            const params = new URLSearchParams(window.location.search);
                            const mode = params.get("mode");
                            const id = params.get("id");
                            if (mode === "add" && id) {
                                handleAddTrigger(id);
                            } else if (mode === "edit") {
                                handleEditTrigger();
                            } else {
                                handleConfirm();
                            }
                        }}
                >
                    {t('create.Confirm')}
                </button >
            </div >

            {/* Delete */}
            {new URLSearchParams(window.location.search).get("mode") === "edit" && (
                <button
                    className={`create-button-delete ${isDeleting ? 'create-button--loading' : ''}`}
                    disabled={isDeleting || isSubmitting}
                    onClick={handleDelete}
                >
                   {isDeleting ? "" : t('create.Delete')}
                </button >
            )}



        </div >
    </div>
  );
}