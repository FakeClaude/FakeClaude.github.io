// src/utils/game/SnakeOrbit.jsx
// 反转版贪吃蛇：
// 传统玩法：吃到食物变长得分。这里恰恰相反——
// 场上有一个彩色格子（--accent），头部直接撞上它 = "偷吃" = 扣分 + 蛇变短（长度不变，仅扣分）；
// 真正的得分方式是"绕着它转圈"：蛇身要同时占满以它为中心、由内到外 n 圈的所有格子
// （第1关=周围8格一圈；第2关=第1圈+第2圈共24格；第3关=再加第3圈共48格……
//  第 n 圈本身有 8n 个格子，n 关总共需要 4n(n+1) 格）。
// 开局蛇长 8，正好等于第1关所需格数，没有多余长度可以浪费，必须严丝合缝绕成一圈。
// 每成功一关，蛇变长 8*(n+1) 格 —— 这个长度不多不少，刚好够拼下一关的圈。
// 成功：+分；直接吃掉：-分（分值见 scoreForLevel：10、50、100、200、300、400...）。
import { useEffect, useMemo, useRef, useState, useCallback } from "preact/hooks";
import { useTranslation } from "react-i18next";

// 常量 & 纯函数：圈层数学 / 分数 / 速度
const BOARD_SIZE = 21;
const INITIAL_TICK_MS = 350; // 初始每步间隔（毫秒），数字越小蛇移动越快
const SPEED_STEP_MS = 8; // 每过一关，间隔缩短多少毫秒（加快程度）
const MIN_TICK_MS = 40; // 间隔下限，防止关卡太多后快到没法反应
const BOOST_INTERVAL_RATIO = 0.4; // 加速时的间隔 = 正常间隔 * 该比例

// 第 n 关需要占满的格子总数：内到外共 n 圈，第 n 圈本身有 8n 格
const requiredCellCount = (n) => 4 * n * (n + 1);
// 完成第 n 关后蛇变长多少格：required(n+1) - required(n)，刚好够拼下一关的圈
const rewardLength = (n) => 8 * (n + 1);
// 每关的加/减分值：第1关10分，第2关50分，第3关起每关多100分（100/200/300/400...）
const scoreForLevel = (n) => (n === 1 ? 10 : n === 2 ? 50 : 100 * (n - 2));
// 每关的移动间隔（速度），随关卡加快，下限 MIN_TICK_MS
const tickIntervalForLevel = (level) =>
  Math.max(MIN_TICK_MS, INITIAL_TICK_MS - (level - 1) * SPEED_STEP_MS);

// 第 n 关要求的具体格子坐标（以 target 为中心，切比雪夫距离 1~n 的所有格子，不含中心本身）
function getRingCells(centerRow, centerCol, n) {
  const cells = [];
  for (let dr = -n; dr <= n; dr++) {
    for (let dc = -n; dc <= n; dc++) {
      if (dr === 0 && dc === 0) continue; // 中心格是彩色目标本身，不算在内
      cells.push([centerRow + dr, centerCol + dc]);
    }
  }
  return cells;
}

// 方向相关
const DIRS = { UP: [-1, 0], DOWN: [1, 0], LEFT: [0, -1], RIGHT: [0, 1] };
const KEY_TO_DIR = {
  ArrowUp: DIRS.UP,
  ArrowDown: DIRS.DOWN,
  ArrowLeft: DIRS.LEFT,
  ArrowRight: DIRS.RIGHT,
};
const isOpposite = (a, b) => a[0] === -b[0] && a[1] === -b[1];
const sameDir = (a, b) => a[0] === b[0] && a[1] === b[1];

// 两点间的移动方向，感知穿墙环绕（差值超过棋盘一半时反向取模）
function wrapAwareDir(newVal, oldVal, boardSize) {
  let diff = newVal - oldVal;
  if (diff > boardSize / 2) diff -= boardSize;
  if (diff < -boardSize / 2) diff += boardSize;
  return Math.sign(diff);
}
function wrapAwareStep(to, from, boardSize) {
  return [wrapAwareDir(to[0], from[0], boardSize), wrapAwareDir(to[1], from[1], boardSize)];
}

// 蛇身外观：圆角造型（直行不需要圆角，转弯/头/尾需要）
const SIDE_OF_DIR = { "-1,0": "top", "1,0": "bottom", "0,-1": "left", "0,1": "right" };
const dirToSide = ([dr, dc]) => SIDE_OF_DIR[`${dr},${dc}`];
const CORNER_RADIUS = {
  "top-left": "50% 0 0 0",
  "top-right": "0 50% 0 0",
  "bottom-right": "0 0 50% 0",
  "bottom-left": "0 0 0 50%",
};
// 转弯处的圆角：dirIn 是"进入这一格时的移动方向"，dirOut 是"离开这一格、往蛇头方向走的方向"
function turnCornerStyle(dirIn, dirOut) {
  if (sameDir(dirIn, dirOut)) return null; // 直行，不需要圆角
  const openSide1 = dirToSide([-dirIn[0], -dirIn[1]]); // 身体从这一侧连过来
  const openSide2 = dirToSide(dirOut); // 身体往这一侧连出去
  const closed = ["top", "right", "bottom", "left"].filter((s) => s !== openSide1 && s !== openSide2);
  if (closed.length !== 2) return null; // 理论上不会发生（比如反向），保险起见跳过
  const key = `${closed.includes("top") ? "top" : "bottom"}-${closed.includes("left") ? "left" : "right"}`;
  return { borderRadius: CORNER_RADIUS[key] };
}
// 蛇头/蛇尾的胶囊造型：往前进方向的两个角变圆
const ROUNDED_END_BY_DIR = {
  "-1,0": { borderRadius: "50% 50% 0 0" }, // 朝上
  "1,0": { borderRadius: "0 0 50% 50%" }, // 朝下
  "0,-1": { borderRadius: "50% 0 0 50%" }, // 朝左
  "0,1": { borderRadius: "0 50% 50% 0" }, // 朝右
};
const roundedEndStyle = ([dr, dc]) => ROUNDED_END_BY_DIR[`${dr},${dc}`];
// 蛇头的两个眼睛位置：垂直于前进方向排布，偏向"前方"
function eyeDotPositions([dr, dc]) {
  if (dr !== 0) {
    const top = dr === -1 ? "30%" : "70%";
    return [{ left: "35%", top }, { left: "65%", top }];
  }
  const left = dc === -1 ? "30%" : "70%";
  return [{ left, top: "35%" }, { left, top: "65%" }];
}

// 游戏局面构造
function createInitialSnake() {
  const startRow = Math.floor(BOARD_SIZE / 2);
  const startCol = Math.floor(BOARD_SIZE / 2) - 4;
  return Array.from({ length: 8 }, (_, i) => [startRow, startCol + 7 - i]); // [0] 是头
}

// 在棋盘上找一个能放下"第 n 关"整圈范围、且不和蛇身重叠的位置
function spawnTarget(level, snakeBody) {
  const snakeSet = new Set(snakeBody.map(([r, c]) => `${r}-${c}`));
  const candidates = [];
  for (let r = level; r < BOARD_SIZE - level; r++) {
    for (let c = level; c < BOARD_SIZE - level; c++) {
      if (!snakeSet.has(`${r}-${c}`)) candidates.push([r, c]);
    }
  }
  if (candidates.length === 0) return null; // 棋盘已经装不下这一关了
  const [row, col] = candidates[Math.floor(Math.random() * candidates.length)];
  return { row, col };
}

// 根据保存的快照（若有）构造开局状态
function buildStartState(progress) {
  if (!progress) {
    const snake = createInitialSnake();
    return { snake, target: spawnTarget(1, snake), level: 1, dir: DIRS.RIGHT, pendingGrowth: 0 };
  }
  return {
    snake: progress.snake,
    target: progress.target,
    level: progress.level,
    dir: progress.direction || DIRS.RIGHT,
    pendingGrowth: progress.pendingGrowth ?? 0,
  };
}

// 调试用：把蛇身摆成"第 n-1 关已完成"的样子（棋盘正中心为目标）。
function buildDebugLevelState(n) {
  const center = { row: Math.floor(BOARD_SIZE / 2), col: Math.floor(BOARD_SIZE / 2) };
  const prevLevel = n - 1;
  const snake = prevLevel > 0 ? getRingCells(center.row, center.col, prevLevel) : createInitialSnake();
  const pendingGrowth = prevLevel > 0 ? rewardLength(prevLevel) : 0;
  // 蛇头选在方阵左上角，往上走一步刚好是空地，不会一进来就撞自己
  return { snake, level: n, target: center, dir: DIRS.UP, pendingGrowth };
}

// 移动端检测：粗指针（触屏）即认为是移动端，用来切换棋盘尺寸单位（vw/vh）
function useIsMobile() {
  const [isMobile] = useState(
    () => typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)").matches
  );
  return isMobile;
}

// 组件
export default function SnakeOrbit({ initialToken = 0, onTokenChange, initialProgress = null, onProgressChange }) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  const [initState] = useState(() => buildStartState(initialProgress));
  const [snake, setSnake] = useState(initState.snake);
  const [level, setLevel] = useState(initState.level);
  const [target, setTarget] = useState(initState.target);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [flashing, setFlashing] = useState(false);

  const flashTimeoutRef = useRef(null);
  const directionRef = useRef(initState.dir);
  const pendingDirRef = useRef(null); // 一个 tick 内最多缓冲一次方向变更，防止连续按键在同一帧内绕过反向检测
  const pendingGrowthRef = useRef(initState.pendingGrowth);
  const startProgressRef = useRef(initialProgress); // "死亡重开后应该恢复到哪一帧"，每次过关会更新成最新快照
  const boostRef = useRef(false); // 是否正在加速（按住与当前朝向相同的方向键）
  const boostKeyRef = useRef(null); // 触发加速的那个按键 code，keyup 时用来匹配释放
  const tickTimeoutRef = useRef(null);
  const tokenRef = useRef(initialToken);

  useEffect(() => {
    tokenRef.current = initialToken;
  }, [initialToken]);

  useEffect(() => () => clearTimeout(flashTimeoutRef.current), []);

  const applyScoreDelta = useCallback(
    (delta) => {
      setScore((s) => s + delta);
      tokenRef.current += delta;
      onTokenChange?.(tokenRef.current, delta);
    },
    [onTokenChange]
  );

  const triggerFlash = useCallback(() => {
    setFlashing(false);
    requestAnimationFrame(() => setFlashing(true));
    clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = setTimeout(() => setFlashing(false), 600);
  }, []);

  // 把游戏状态整体切换到某一局面（重开 / 调试跳关共用）
  const loadState = useCallback((start) => {
    setSnake(start.snake);
    setLevel(start.level);
    setTarget(start.target);
    directionRef.current = start.dir;
    pendingDirRef.current = null;
    boostRef.current = false;
    boostKeyRef.current = null;
    pendingGrowthRef.current = start.pendingGrowth;
    clearTimeout(flashTimeoutRef.current);
    setFlashing(false);
    setGameOver(false);
  }, []);

  const restart = useCallback(() => {
    loadState(buildStartState(startProgressRef.current));
  }, [loadState]);

  // 仅供调试：直接跳到第 n 关
  const jumpToLevel = useCallback(
    (n) => {
      const debugState = buildDebugLevelState(n);
      loadState(debugState);
      startProgressRef.current = {
        level: debugState.level,
        snake: debugState.snake,
        target: debugState.target,
        direction: debugState.dir,
        pendingGrowth: debugState.pendingGrowth,
      };
    },
    [loadState]
  );

  useEffect(() => {
    window.__snakeOrbitDebug = { jumpToLevel };
    return () => {
      delete window.__snakeOrbitDebug;
    };
  }, [jumpToLevel]);

  // 每个 tick 的核心推进逻辑
  const tick = useCallback(() => {
    // 每个 tick 只应用一次方向变更，防止一帧内多次按键连续改变方向导致反向撞自己
    if (pendingDirRef.current) {
      directionRef.current = pendingDirRef.current;
      pendingDirRef.current = null;
    }

    setSnake((prevSnake) => {
      const [headR, headC] = prevSnake[0];
      const [dr, dc] = directionRef.current;
      // 穿墙：坐标取模环绕到棋盘另一侧
      const newHead = [(headR + dr + BOARD_SIZE) % BOARD_SIZE, (headC + dc + BOARD_SIZE) % BOARD_SIZE];

      // 撞自己（尾巴那一格如果这一步会被移走，不算撞）
      const willMoveTail = pendingGrowthRef.current === 0;
      const bodyToCheck = willMoveTail ? prevSnake.slice(0, -1) : prevSnake;
      if (bodyToCheck.some(([r, c]) => r === newHead[0] && c === newHead[1])) {
        setGameOver(true);
        return prevSnake;
      }

      const advance = (extendBy = 0) => {
        const newSnake = [newHead, ...prevSnake];
        if (pendingGrowthRef.current > 0) pendingGrowthRef.current -= 1;
        else newSnake.pop();
        pendingGrowthRef.current += extendBy;
        return newSnake;
      };

      const hitTarget = target && newHead[0] === target.row && newHead[1] === target.col;

      // 直接吃到彩色格子 = 偷吃，只扣分，蛇身长度不变（否则可能永远凑不齐这一关所需格数）
      if (hitTarget) {
        applyScoreDelta(-scoreForLevel(level));
        const newSnake = advance();
        const newTarget = spawnTarget(level, newSnake);
        setTarget(newTarget);
        if (!newTarget) setGameOver(true);
        return newSnake;
      }

      // 正常移动
      const newSnake = advance();

      // 检查是否绕成了这一关要求的圈
      if (target) {
        const required = getRingCells(target.row, target.col, level);
        const bodySet = new Set(newSnake.map(([r, c]) => `${r}-${c}`));
        const ringComplete =
          newSnake.length === requiredCellCount(level) && required.every(([r, c]) => bodySet.has(`${r}-${c}`));

        if (ringComplete) {
          applyScoreDelta(scoreForLevel(level));
          pendingGrowthRef.current += rewardLength(level);
          triggerFlash();

          const nextLevel = level + 1;
          setLevel(nextLevel);
          const newTarget = spawnTarget(nextLevel, newSnake);
          setTarget(newTarget);
          if (!newTarget) {
            setGameOver(true);
          } else {
            // 记录闪烁这一瞬间的完整快照：死亡重开或刷新后精确恢复到这一帧，而不是重新拼一个"看起来像"的姿态
            const snapshot = {
              level: nextLevel,
              snake: newSnake,
              target: newTarget,
              direction: directionRef.current,
              pendingGrowth: pendingGrowthRef.current,
            };
            startProgressRef.current = snapshot;
            onProgressChange?.(snapshot);
          }
        }
      }

      return newSnake;
    });
  }, [level, target, applyScoreDelta, triggerFlash, onProgressChange]);

  // 公共转向逻辑：键盘和触屏共用，同样遵守"一个 tick 只缓冲一次转向 + 不能直接反向"
  const tryTurn = useCallback((next) => {
    if (pendingDirRef.current) return;
    if (isOpposite(next, directionRef.current)) return;
    pendingDirRef.current = next;
  }, []);

  // 键盘：方向键转向；按住与当前方向相同的键 = 加速；游戏结束时任意键重开
  useEffect(() => {
    function handleKeyDown(e) {
      if (gameOver) {
        e.preventDefault();
        restart();
        return;
      }
      const dir = KEY_TO_DIR[e.code];
      if (!dir) return;
      e.preventDefault();
      if (sameDir(dir, directionRef.current)) {
        boostRef.current = true;
        boostKeyRef.current = e.code;
      } else {
        tryTurn(dir);
      }
    }
    function handleKeyUp(e) {
      if (e.code === boostKeyRef.current) {
        boostRef.current = false;
        boostKeyRef.current = null;
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [gameOver, restart, tryTurn]);

  // 触屏：把整个容器按对角线（X形）分成上/下/左/右四个三角区，点哪个区就往哪个方向转
  const handleTouchDirection = useCallback(
    (clientX, clientY, rect) => {
      const dx = (clientX - rect.left - rect.width / 2) / (rect.width / 2);
      const dy = (clientY - rect.top - rect.height / 2) / (rect.height / 2);
      const next =
        Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? DIRS.RIGHT : DIRS.LEFT) : dy > 0 ? DIRS.DOWN : DIRS.UP;
      tryTurn(next);
    },
    [tryTurn]
  );

  // 游戏循环：每过一关间隔缩短一点（更快），加速键按住时间隔再乘以 BOOST_INTERVAL_RATIO
  useEffect(() => {
    if (gameOver) {
      clearTimeout(tickTimeoutRef.current);
      return;
    }
    let cancelled = false;
    function schedule() {
      const base = tickIntervalForLevel(level);
      const interval = boostRef.current ? Math.max(MIN_TICK_MS, Math.round(base * BOOST_INTERVAL_RATIO)) : base;
      tickTimeoutRef.current = setTimeout(() => {
        if (cancelled) return;
        tick();
        schedule();
      }, interval);
    }
    schedule();
    return () => {
      cancelled = true;
      clearTimeout(tickTimeoutRef.current);
    };
  }, [tick, gameOver, level]);

  // ------------------------------
  // 渲染相关的派生数据
  // ------------------------------
  const snakeSet = useMemo(() => new Set(snake.map(([r, c]) => `${r}-${c}`)), [snake]);
  const cellSize = isMobile ? `${100 / BOARD_SIZE}vw` : `${100 / BOARD_SIZE}vh`;

  const headKey = `${snake[0][0]}-${snake[0][1]}`;
  const tailIdx = snake.length - 1;
  const tail = snake[tailIdx];
  const tailKey = `${tail[0]}-${tail[1]}`;
  const headDir = directionRef.current; // 蛇头朝向：直接用当前实际移动方向（不是排队中的转向）

  // 蛇尾朝向：尾巴前一节指向尾巴本身的方向，即"如果尾巴继续往前爬会去哪"
  const tailDir = useMemo(() => {
    if (tailIdx === 0) return headDir;
    const dir = wrapAwareStep(tail, snake[tailIdx - 1], BOARD_SIZE);
    return dir[0] === 0 && dir[1] === 0 ? headDir : dir;
  }, [snake, tailIdx, tail, headDir]);

  // 身体每一节（不含头尾）的转弯圆角：dirIn 是上一步怎么走到这一格的，dirOut 是接下来往头部方向怎么走
  const bodyCornerMap = useMemo(() => {
    const map = new Map();
    for (let i = 1; i < tailIdx; i++) {
      const dirIn = wrapAwareStep(snake[i], snake[i + 1], BOARD_SIZE);
      const dirOut = wrapAwareStep(snake[i - 1], snake[i], BOARD_SIZE);
      const style = turnCornerStyle(dirIn, dirOut);
      if (style) map.set(`${snake[i][0]}-${snake[i][1]}`, style);
    }
    return map;
  }, [snake, tailIdx]);

  const handleContainerClick = () => gameOver && restart();
  const handleContainerTouchStart = (e) => {
    if (gameOver) {
      restart();
      return;
    }
    const touch = e.touches[0];
    if (!touch) return;
    handleTouchDirection(touch.clientX, touch.clientY, e.currentTarget.getBoundingClientRect());
  };

  return (
    <div
      onClick={handleContainerClick}
      onTouchStart={handleContainerTouchStart}
      style={{
        position: isMobile ? "fixed" : "relative",
        left: isMobile ? 0 : undefined,
        top: isMobile ? 0 : undefined,
        fontFamily: "monospace",
        color: "var(--text-main)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: isMobile ? "100vw" : undefined,
        height: "100vh",
      }}
    >
      <style>{`
        @keyframes snakeOrbitFlash {
          0%   { opacity: 0; }
          25%  { opacity: 1; }
          50%  { opacity: 0; }
          75%  { opacity: 1; }
          100% { opacity: 1; }
        }
      `}</style>
      {gameOver && <GameOverBanner text={t("game.Game over, click to restart")} />}
      <Board
        boardSize={BOARD_SIZE}
        cellSize={cellSize}
        target={target}
        snakeSet={snakeSet}
        headKey={headKey}
        tailKey={tailKey}
        headDir={headDir}
        tailDir={tailDir}
        bodyCornerMap={bodyCornerMap}
        flashing={flashing}
      />
    </div>
  );
}

// 展示型子组件
function GameOverBanner({ text }) {
  return (
    <div
      style={{
        position: "fixed",
        top: "25%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        background: "var(--home-bg)",
        color: "var(--text-white)",
        fontWeight: "bold",
        fontSize: "20px",
        padding: "10px 16px",
        zIndex: 10,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
}
function Board({ boardSize, cellSize, target, snakeSet, headKey, tailKey, headDir, tailDir, bodyCornerMap, flashing }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${boardSize}, ${cellSize})`,
        gridTemplateRows: `repeat(${boardSize}, ${cellSize})`,
        gap: "0",
        background: "var(--line)",
      }}
    >
      {Array.from({ length: boardSize }).flatMap((_, r) =>
        Array.from({ length: boardSize }).map((_, c) => {
          const key = `${r}-${c}`;
          const isTarget = target && target.row === r && target.col === c;
          const isHead = key === headKey;
          const isTail = !isHead && key === tailKey;
          const isSnake = snakeSet.has(key);
          return (
            <Cell key={key} cellSize={cellSize} isTarget={isTarget}>
              {isSnake && (
                <SnakeSegment
                  isHead={isHead}
                  isTail={isTail}
                  dir={isHead ? headDir : isTail ? tailDir : null}
                  cornerStyle={bodyCornerMap.get(key)}
                  flashing={flashing}
                />
              )}
            </Cell>
          );
        })
      )}
    </div>
  );
}
function Cell({ cellSize, isTarget, children }) {
  return (
    <div
      style={{
        width: cellSize,
        height: cellSize,
        border: ".5px solid var(--line)",
        background: "var(--card-bg)",
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {isTarget && (
        <div style={{ width: "calc(100% - .5px)", height: "calc(100% - .5px)", margin: ".5px", background: "var(--accent)" }} />
      )}
      {children}
    </div>
  );
}
function SnakeSegment({ isHead, isTail, dir, cornerStyle, flashing }) {
  const shapeStyle = isHead || isTail ? roundedEndStyle(dir) : cornerStyle || null;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        margin: 0,
        background: "var(--text-placeholder)",
        animation: flashing ? "snakeOrbitFlash .6s steps(1) 1" : "none",
        position: "relative",
        ...(shapeStyle || {}),
      }}
    >
      {isHead &&
        eyeDotPositions(dir).map((pos, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: pos.left,
              top: pos.top,
              transform: "translate(-50%, -50%)",
              width: "18%",
              height: "18%",
              borderRadius: "50%",
              background: "var(--card-bg)",
            }}
          />
        ))}
    </div>
  );
}