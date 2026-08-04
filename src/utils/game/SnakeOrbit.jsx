// src/utils/game/SnakeOrbit.jsx
// 反转版贪吃蛇：
// 传统玩法：吃到食物变长得分。这里恰恰相反——
// 场上有一个彩色格子（--accent），头部直接撞上它 = "偷吃" = 扣分 + 蛇变短；
// 真正的得分方式是"绕着它转圈"：蛇身要同时占满以它为中心、由内到外 n 圈的所有格子
// （第1关=周围8格一圈；第2关=第1圈+第2圈共24格；第3关=再加第3圈共48格……
//  第 n 圈本身有 8n 个格子，n 关总共需要 4n(n+1) 格）。
// 开局蛇长 8，正好等于第1关所需格数，没有多余长度可以浪费，必须严丝合缝绕成一圈。
// 每成功一关，蛇变长 8*(n+1) 格 —— 这个长度不多不少，刚好够拼下一关的圈。
// 成功：+分；直接吃掉：-分（分值见 scoreForLevel：10、50、100、200、300、400...）。

import { useEffect, useRef, useState, useCallback } from "preact/hooks";
import { useTranslation } from "react-i18next";

// ------------------------------
// 棋盘尺寸（奇数，方便以某一格为正中心对称画圈）
// ------------------------------
const BOARD_SIZE = 21;
const CENTER_MARGIN = BOARD_SIZE; // 仅用于占位说明，实际边界判断见 spawnTarget

// ------------------------------
// 环形/圈层相关的数学
// ------------------------------
// 第 n 关，从内到外总共需要占的格子数：1~n 圈的格子总和 = 4n(n+1)
function requiredCellCount(n) {
  return 4 * n * (n + 1);
}
// 每关的加/减分值：第1关10分，第2关50分，第3关起每关多100分（100/200/300/400...）
function scoreForLevel(n) {
  if (n === 1) return 10;
  if (n === 2) return 50;
  return 100 * (n - 2);
}
// 完成第 n 关后，蛇变长多少格（刚好够拼下一关）：required(n+1) - required(n) = 8(n+1)
function rewardLength(n) {
  return 8 * (n + 1);
}
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

// ------------------------------
// 移动速度：每过一关（每吃到/绕成功一次），下落间隔缩短一点，速度变快
// INITIAL_TICK_MS：初始每步间隔（毫秒），数字越小蛇移动越快
// SPEED_STEP_MS：每过一关，间隔缩短多少毫秒（加快程度）
// MIN_TICK_MS：间隔下限，防止关卡太多后快到没法反应
// ------------------------------
const INITIAL_TICK_MS = 350;
const SPEED_STEP_MS = 8;
const MIN_TICK_MS = 40;
const BOOST_INTERVAL_RATIO = 0.4; // 加速时的间隔 = 正常间隔 * 该比例
function getTickInterval(level) {
  return Math.max(MIN_TICK_MS, INITIAL_TICK_MS - (level - 1) * SPEED_STEP_MS);
}

// ------------------------------
// 蛇的方向
// ------------------------------
const DIRS = {
  UP: [-1, 0],
  DOWN: [1, 0],
  LEFT: [0, -1],
  RIGHT: [0, 1],
};
function isOpposite(a, b) {
  return a[0] === -b[0] && a[1] === -b[1];
}
function wrapAwareSign(newVal, oldVal, boardSize) {
  let diff = newVal - oldVal;
  if (diff > boardSize / 2) diff -= boardSize;
  if (diff < -boardSize / 2) diff += boardSize;
  return Math.sign(diff);
}
function dirToSide(dir) {
  const [dr, dc] = dir;
  if (dr === -1) return "top";
  if (dr === 1) return "bottom";
  if (dc === -1) return "left";
  return "right";
}
const CORNER_RADIUS = {
  "top-left": "50% 0 0 0",
  "top-right": "0 50% 0 0",
  "bottom-right": "0 0 50% 0",
  "bottom-left": "0 0 0 50%",
};
// 转弯处的圆角：dirIn 是"进入这一格时的移动方向"，dirOut 是"离开这一格、往蛇头方向走的方向"。
// 直行（两个方向一致）不需要圆角；拐弯时，圆角画在"没有身体连接的那两条边"的交角处，
// 让两段直的身体之间用一个圆弧平滑过渡。
function turnCornerStyle(dirIn, dirOut) {
  if (dirIn[0] === dirOut[0] && dirIn[1] === dirOut[1]) return null; // 直行
  const openSide1 = dirToSide([-dirIn[0], -dirIn[1]]); // 身体从这一侧连过来
  const openSide2 = dirToSide(dirOut); // 身体往这一侧连出去
  const allSides = ["top", "right", "bottom", "left"];
  const closed = allSides.filter((s) => s !== openSide1 && s !== openSide2);
  if (closed.length !== 2) return null; // 理论上不会发生（比如反向），保险起见跳过
  const key = closed.includes("top")
    ? closed.includes("left")
      ? "top-left"
      : "top-right"
    : closed.includes("left")
    ? "bottom-left"
    : "bottom-right";
  return { borderRadius: CORNER_RADIUS[key] };
}

// 根据朝向返回"这一格该往哪一侧鼓出圆角"，用于蛇头/蛇尾的胶囊造型
// dir 指向的那一侧是"外凸/前进"方向，对应的两个角做成圆角
function roundedEndStyle(dir) {
  const [dr, dc] = dir;
  if (dr === -1) return { borderRadius: "50% 50% 0 0" }; // 朝上：上方两角圆
  if (dr === 1) return { borderRadius: "0 0 50% 50%" }; // 朝下：下方两角圆
  if (dc === -1) return { borderRadius: "50% 0 0 50%" }; // 朝左：左侧两角圆
  return { borderRadius: "0 50% 50% 0" }; // 朝右：右侧两角圆
}

// 蛇头的两个眼睛位置：垂直于前进方向排布，偏向"前方"
function eyeDotPositions(dir) {
  const [dr, dc] = dir;
  if (dr !== 0) {
    // 上下方向：眼睛左右排开
    const top = dr === -1 ? "30%" : "70%";
    return [
      { left: "35%", top },
      { left: "65%", top },
    ];
  }
  // 左右方向：眼睛上下排开
  const left = dc === -1 ? "30%" : "70%";
  return [
    { left, top: "35%" },
    { left, top: "65%" },
  ];
}

function createInitialSnake() {
  // 开局身体长度 8，水平排列在棋盘中间偏左的位置，头在最右端
  const startRow = Math.floor(BOARD_SIZE / 2);
  const startCol = Math.floor(BOARD_SIZE / 2) - 4;
  const body = [];
  for (let i = 7; i >= 0; i--) {
    body.push([startRow, startCol + i]);
  }
  return body; // body[0] 是头
}

// 在棋盘上找一个能放下"第 n 关"整圈范围、且不和蛇身重叠的位置
function spawnTarget(level, snakeBody) {
  const snakeSet = new Set(snakeBody.map(([r, c]) => `${r}-${c}`));
  const candidates = [];
  for (let r = level; r < BOARD_SIZE - level; r++) {
    for (let c = level; c < BOARD_SIZE - level; c++) {
      if (!snakeSet.has(`${r}-${c}`)) {
        candidates.push([r, c]);
      }
    }
  }
  if (candidates.length === 0) return null; // 棋盘已经装不下这一关了
  const [row, col] = candidates[Math.floor(Math.random() * candidates.length)];
  return { row, col };
}

// 根据保存的快照（若有）构造开局状态：
// 没有快照 = 第1关默认开局；有快照 = 精确恢复到"上次过关（身体闪烁）那一瞬间"的
// 身体坐标、目标位置、方向、待长出的量，不再用规则重新拼一个"看起来像"的姿态
function buildStartState(progress) {
  if (!progress) {
    const initial = createInitialSnake();
    return { snake: initial, target: spawnTarget(1, initial), level: 1, dir: DIRS.RIGHT, pendingGrowth: 0 };
  }
  return {
    snake: progress.snake,
    target: progress.target,
    level: progress.level,
    dir: progress.direction || DIRS.RIGHT,
    pendingGrowth: progress.pendingGrowth ?? 0,
  };
}

// ------------------------------
// 组件
// ------------------------------
export default function SnakeOrbit({ initialToken = 0, onTokenChange, initialProgress = null, onProgressChange }) {
  const { t } = useTranslation();
  const [initState] = useState(() => buildStartState(initialProgress));
  const [snake, setSnake] = useState(initState.snake);
  const [level, setLevel] = useState(initState.level);
  const [target, setTarget] = useState(initState.target);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const flashTimeoutRef = useRef(null);
  const directionRef = useRef(initState.dir);
  const startProgressRef = useRef(initialProgress); // "死亡重开后应该恢复到哪一帧"，每次过关会更新成最新快照
  const pendingDirRef = useRef(null); // 一个 tick 内最多缓冲一次方向变更，防止连续按键在同一帧内绕过反向检测
  const boostRef = useRef(false); // 是否正在加速（按住与当前朝向相同的方向键）
  const boostKeyRef = useRef(null); // 触发加速的那个按键 code，keyup 时用来匹配释放
  const pendingGrowthRef = useRef(initState.pendingGrowth);
  const intervalRef = useRef(null);
  const tokenRef = useRef(initialToken);
  // 移动端检测：粗指针（触屏）即认为是移动端，用来切换棋盘尺寸单位（vw/vh）
  const [isMobile] = useState(() =>
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(pointer: coarse)").matches
      : false
  );

  useEffect(() => {
    tokenRef.current = initialToken;
  }, [initialToken]);

  useEffect(() => {
    return () => clearTimeout(flashTimeoutRef.current);
  }, []);

  const applyScoreDelta = useCallback((delta) => {
    setScore((s) => s + delta);
    const newToken = tokenRef.current + delta;
    tokenRef.current = newToken;
    onTokenChange?.(newToken, delta);
  }, [onTokenChange]);

  const restart = useCallback(() => {
    const start = buildStartState(startProgressRef.current);
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

  // 仅供调试：直接跳到第 n 关，把蛇身摆成"第 n-1 关已完成"的样子（棋盘正中心为目标），
  // 蛇身格子的具体连接顺序不影响游戏逻辑（碰撞检测只看格子集合，不看路径顺序），
  // 所以可以直接用 getRingCells 生成的整块方阵当作蛇身。
  const jumpToLevel = useCallback((n) => {
    const center = { row: Math.floor(BOARD_SIZE / 2), col: Math.floor(BOARD_SIZE / 2) };
    const prevLevel = n - 1;
    const filled =
      prevLevel > 0 ? getRingCells(center.row, center.col, prevLevel) : createInitialSnake();
    setSnake(filled);
    setLevel(n);
    const debugTarget = { row: center.row, col: center.col };
    setTarget(debugTarget);
    // 蛇头选在方阵左上角，往上走一步刚好是空地，不会一进来就撞自己
    directionRef.current = DIRS.UP;
    const debugPendingGrowth = prevLevel > 0 ? rewardLength(prevLevel) : 0;
    startProgressRef.current = {
      level: n,
      snake: filled,
      target: debugTarget,
      direction: DIRS.UP,
      pendingGrowth: debugPendingGrowth,
    };
    pendingDirRef.current = null;
    boostRef.current = false;
    boostKeyRef.current = null;
    pendingGrowthRef.current = debugPendingGrowth;
    clearTimeout(flashTimeoutRef.current);
    setFlashing(false);
    setGameOver(false);
  }, []);

  useEffect(() => {
    window.__snakeOrbitDebug = { jumpToLevel };
    return () => {
      delete window.__snakeOrbitDebug;
    };
  }, [jumpToLevel]);

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
      const newHead = [
        (headR + dr + BOARD_SIZE) % BOARD_SIZE,
        (headC + dc + BOARD_SIZE) % BOARD_SIZE,
      ];

      // 撞自己（尾巴那一格如果这一步会被移走，不算撞）
      const willMoveTail = pendingGrowthRef.current === 0;
      const bodyToCheck = willMoveTail ? prevSnake.slice(0, -1) : prevSnake;
      if (bodyToCheck.some(([r, c]) => r === newHead[0] && c === newHead[1])) {
        setGameOver(true);
        return prevSnake;
      }

      // 直接吃到彩色格子 = 偷吃，只扣分，蛇身长度不变（否则可能永远凑不齐这一关所需格数）
      if (target && newHead[0] === target.row && newHead[1] === target.col) {
        const penalty = scoreForLevel(level);
        applyScoreDelta(-penalty);

        // 蛇正常往前移动一格（头进尾出），长度保持不变
        const newSnake = [newHead, ...prevSnake];
        if (pendingGrowthRef.current > 0) {
          pendingGrowthRef.current -= 1;
        } else {
          newSnake.pop();
        }
        const newTarget = spawnTarget(level, newSnake);
        setTarget(newTarget);
        if (!newTarget) {
          setGameOver(true);
        }
        return newSnake;
      }

      // 正常移动
      const newSnake = [newHead, ...prevSnake];
      if (pendingGrowthRef.current > 0) {
        pendingGrowthRef.current -= 1;
      } else {
        newSnake.pop();
      }

      // 检查是否绕成了这一关要求的圈
      if (target) {
        const required = getRingCells(target.row, target.col, level);
        const bodySet = new Set(newSnake.map(([r, c]) => `${r}-${c}`));
        const complete =
          newSnake.length === requiredCellCount(level) &&
          required.every(([r, c]) => bodySet.has(`${r}-${c}`));
        if (complete) {
          const gained = scoreForLevel(level);
          applyScoreDelta(gained);
          const newPendingGrowth = pendingGrowthRef.current + rewardLength(level);
          pendingGrowthRef.current = newPendingGrowth;

          // 触发一次身体闪烁提示（透明度 0-1-0-1）
          setFlashing(false);
          requestAnimationFrame(() => setFlashing(true));
          clearTimeout(flashTimeoutRef.current);
          flashTimeoutRef.current = setTimeout(() => setFlashing(false), 600);

          const nextLevel = level + 1;
          setLevel(nextLevel);
          const newTarget = spawnTarget(nextLevel, newSnake);
          setTarget(newTarget);
          if (!newTarget) {
            setGameOver(true);
          } else {
            // 记录闪烁这一瞬间的完整快照：身体坐标、下一关目标、当前方向、待长出的量，
            // 死亡重开或刷新后精确恢复到这一帧，而不是重新拼一个"看起来像"的姿态
            const snapshot = {
              level: nextLevel,
              snake: newSnake,
              target: newTarget,
              direction: directionRef.current,
              pendingGrowth: newPendingGrowth,
            };
            startProgressRef.current = snapshot;
            onProgressChange?.(snapshot);
          }
        }
      }

      return newSnake;
    });
  }, [level, target, applyScoreDelta, onProgressChange]);

  // 公共转向逻辑：键盘和触屏共用，同样遵守"一个 tick 只缓冲一次转向 + 不能直接反向"
  const tryTurn = useCallback((next) => {
    if (pendingDirRef.current) return;
    if (isOpposite(next, directionRef.current)) return;
    pendingDirRef.current = next;
  }, []);

  useEffect(() => {
    function handleKey(e) {
      if (gameOver) {
        e.preventDefault();
        restart();
        return;
      }
      let next = null;
      if (e.code === "ArrowUp") next = DIRS.UP;
      else if (e.code === "ArrowDown") next = DIRS.DOWN;
      else if (e.code === "ArrowLeft") next = DIRS.LEFT;
      else if (e.code === "ArrowRight") next = DIRS.RIGHT;
      if (!next) return;
      e.preventDefault();
      // 按下的方向和当前正在走的方向一致 = 加速；松开这个键再恢复正常速度
      if (next[0] === directionRef.current[0] && next[1] === directionRef.current[1]) {
        boostRef.current = true;
        boostKeyRef.current = e.code;
        return;
      }
      tryTurn(next);
    }
    function handleKeyUp(e) {
      if (e.code === boostKeyRef.current) {
        boostRef.current = false;
        boostKeyRef.current = null;
      }
    }
    window.addEventListener("keydown", handleKey);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [gameOver, restart, tryTurn]);

  // 触屏操作：把整个容器按对角线（X形）分成上/下/左/右四个三角区，点哪个区就往哪个方向转
  const handleTouchDirection = useCallback(
    (clientX, clientY, rect) => {
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const dx = clientX - rect.left - cx;
      const dy = clientY - rect.top - cy;
      // 按矩形宽高分别归一化，这样对角线正好是矩形的两条对角线（而不是45°斜线）
      const nx = dx / cx;
      const ny = dy / cy;
      let next;
      if (Math.abs(nx) > Math.abs(ny)) {
        next = nx > 0 ? DIRS.RIGHT : DIRS.LEFT;
      } else {
        next = ny > 0 ? DIRS.DOWN : DIRS.UP;
      }
      tryTurn(next);
    },
    [tryTurn]
  );

  useEffect(() => {
    if (gameOver) {
      clearTimeout(intervalRef.current);
      return;
    }
    let cancelled = false;
    function schedule() {
      // 每过一关，间隔缩短一点，速度变快；具体数值见文件顶部 INITIAL_TICK_MS / SPEED_STEP_MS / MIN_TICK_MS
      const base = getTickInterval(level);
      const interval = boostRef.current
        ? Math.max(MIN_TICK_MS, Math.round(base * BOOST_INTERVAL_RATIO))
        : base;
      intervalRef.current = setTimeout(() => {
        if (cancelled) return;
        tick();
        schedule();
      }, interval);
    }
    schedule();
    return () => {
      cancelled = true;
      clearTimeout(intervalRef.current);
    };
  }, [tick, gameOver, level]);

  // ------------------------------
  // 渲染
  // ------------------------------
  const snakeSet = new Set(snake.map(([r, c]) => `${r}-${c}`));
  const cellSize = isMobile ? `${100 / BOARD_SIZE}vw` : `${100 / BOARD_SIZE}vh`;

  const headKey = `${snake[0][0]}-${snake[0][1]}`;
  const tailIdx = snake.length - 1;
  const tailKey = `${snake[tailIdx][0]}-${snake[tailIdx][1]}`;
  // 蛇头朝向：直接用当前实际移动方向（不是排队中的转向）
  const headDir = directionRef.current;
  // 蛇尾朝向：尾巴前一节指向尾巴本身的方向，即"如果尾巴继续往前爬会去哪"
  const beforeTail = snake[Math.max(tailIdx - 1, 0)];
  const tail = snake[tailIdx];
  const tailDir =
    tailIdx > 0
      ? [
          wrapAwareSign(tail[0], beforeTail[0], BOARD_SIZE),
          wrapAwareSign(tail[1], beforeTail[1], BOARD_SIZE),
        ]
      : headDir;
  const safeTailDir = tailDir[0] === 0 && tailDir[1] === 0 ? headDir : tailDir;

  // 身体每一节（不含头尾）的转弯圆角：dirIn 是上一步怎么走到这一格的，dirOut 是接下来往头部方向怎么走
  const bodyCornerMap = new Map();
  for (let i = 1; i < tailIdx; i++) {
    const behind = snake[i + 1];
    const cur = snake[i];
    const ahead = snake[i - 1];
    const dirIn = [wrapAwareSign(cur[0], behind[0], BOARD_SIZE), wrapAwareSign(cur[1], behind[1], BOARD_SIZE)];
    const dirOut = [wrapAwareSign(ahead[0], cur[0], BOARD_SIZE), wrapAwareSign(ahead[1], cur[1], BOARD_SIZE)];
    const style = turnCornerStyle(dirIn, dirOut);
    if (style) bodyCornerMap.set(`${cur[0]}-${cur[1]}`, style);
  }

  return (
    <div
      onClick={() => {
        if (gameOver) restart();
      }}
      onTouchStart={(e) => {
        if (gameOver) {
          restart();
          return;
        }
        const touch = e.touches[0];
        if (!touch) return;
        const rect = e.currentTarget.getBoundingClientRect();
        handleTouchDirection(touch.clientX, touch.clientY, rect);
      }}
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
      {gameOver && (
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
          {t("game.Game over, click to restart")}
        </div>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${BOARD_SIZE}, ${cellSize})`,
          gridTemplateRows: `repeat(${BOARD_SIZE}, ${cellSize})`,
          gap: "0",
          background: "var(--line)",
        }}
      >
        {Array.from({ length: BOARD_SIZE }).flatMap((_, r) =>
          Array.from({ length: BOARD_SIZE }).map((_, c) => {
            const key = `${r}-${c}`;
            const isSnake = snakeSet.has(key);
            const isTarget = target && target.row === r && target.col === c;
            return (
              <div
                key={key}
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
                  <div
                    style={{
                      width: "calc(100% - .5px)",
                      height: "calc(100% - .5px)",
                      margin: ".5px",
                      background: "var(--accent)",
                    }}
                  />
                )}
                {isSnake && (() => {
                  const isHead = key === headKey;
                  const isTail = !isHead && key === tailKey;
                  const shapeStyle = isHead
                    ? roundedEndStyle(headDir)
                    : isTail
                    ? roundedEndStyle(safeTailDir)
                    : bodyCornerMap.get(key) || null;
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
                        eyeDotPositions(headDir).map((pos, i) => (
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
                })()}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}