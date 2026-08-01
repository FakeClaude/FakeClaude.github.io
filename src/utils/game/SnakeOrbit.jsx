// src/utils/game/SnakeOrbit.jsx
// 反转版贪吃蛇：
// 传统玩法：吃到食物变长得分。这里恰恰相反——
// 场上有一个彩色格子（--accent），头部直接撞上它 = "偷吃" = 扣分 + 蛇变短；
// 真正的得分方式是"绕着它转圈"：蛇身要同时占满以它为中心、由内到外 n 圈的所有格子
// （第1关=周围8格一圈；第2关=第1圈+第2圈共24格；第3关=再加第3圈共48格……
//  第 n 圈本身有 8n 个格子，n 关总共需要 4n(n+1) 格）。
// 开局蛇长 8，正好等于第1关所需格数，没有多余长度可以浪费，必须严丝合缝绕成一圈。
// 每成功一关，蛇变长 8*(n+1) 格 —— 这个长度不多不少，刚好够拼下一关的圈。
// 成功：+10^n 分；直接吃掉：-10^n 分，同时蛇缩短到"上一关所需长度"（第1关失败只缩短1格）。

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
const INITIAL_TICK_MS = 150;
const SPEED_STEP_MS = 8;
const MIN_TICK_MS = 40;
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

// ------------------------------
// 组件
// ------------------------------
export default function SnakeOrbit({ initialToken = 0, onTokenChange }) {
  const { t } = useTranslation();
  const [snake, setSnake] = useState(createInitialSnake);
  const [level, setLevel] = useState(1);
  const [target, setTarget] = useState(() => spawnTarget(1, createInitialSnake()));
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const directionRef = useRef(DIRS.RIGHT);
  const pendingGrowthRef = useRef(0);
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

  const applyScoreDelta = useCallback((delta) => {
    setScore((s) => s + delta);
    const newToken = tokenRef.current + delta;
    tokenRef.current = newToken;
    onTokenChange?.(newToken, delta);
  }, [onTokenChange]);

  const restart = useCallback(() => {
    const initial = createInitialSnake();
    setSnake(initial);
    setLevel(1);
    setTarget(spawnTarget(1, initial));
    directionRef.current = DIRS.RIGHT;
    pendingGrowthRef.current = 0;
    setGameOver(false);
  }, []);

  const tick = useCallback(() => {
    setSnake((prevSnake) => {
      const [headR, headC] = prevSnake[0];
      const [dr, dc] = directionRef.current;
      const newHead = [headR + dr, headC + dc];

      // 撞墙
      if (
        newHead[0] < 0 ||
        newHead[0] >= BOARD_SIZE ||
        newHead[1] < 0 ||
        newHead[1] >= BOARD_SIZE
      ) {
        setGameOver(true);
        return prevSnake;
      }

      // 撞自己（尾巴那一格如果这一步会被移走，不算撞）
      const willMoveTail = pendingGrowthRef.current === 0;
      const bodyToCheck = willMoveTail ? prevSnake.slice(0, -1) : prevSnake;
      if (bodyToCheck.some(([r, c]) => r === newHead[0] && c === newHead[1])) {
        setGameOver(true);
        return prevSnake;
      }

      // 直接吃到彩色格子 = 偷吃，扣分 + 缩短
      if (target && newHead[0] === target.row && newHead[1] === target.col) {
        const penalty = Math.pow(10, level);
        applyScoreDelta(-penalty);

        const shrinkTo = level === 1 ? prevSnake.length - 1 : requiredCellCount(level - 1);
        const newSnake = [newHead, ...prevSnake].slice(0, Math.max(shrinkTo, 1));
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
          const gained = Math.pow(10, level);
          applyScoreDelta(gained);
          pendingGrowthRef.current += rewardLength(level);
          const nextLevel = level + 1;
          setLevel(nextLevel);
          const newTarget = spawnTarget(nextLevel, newSnake);
          setTarget(newTarget);
          if (!newTarget) {
            setGameOver(true);
          }
        }
      }

      return newSnake;
    });
  }, [level, target, applyScoreDelta]);

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
      if (isOpposite(next, directionRef.current)) return; // 不能直接反向
      directionRef.current = next;
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameOver, restart]);

  useEffect(() => {
    if (gameOver) {
      clearInterval(intervalRef.current);
      return;
    }
    // 每过一关，间隔缩短一点，速度变快；具体数值见文件顶部 INITIAL_TICK_MS / SPEED_STEP_MS / MIN_TICK_MS
    intervalRef.current = setInterval(tick, getTickInterval(level));
    return () => clearInterval(intervalRef.current);
  }, [tick, gameOver, level]);

  // ------------------------------
  // 渲染
  // ------------------------------
  const snakeSet = new Set(snake.map(([r, c]) => `${r}-${c}`));
  const cellSize = isMobile ? `${100 / BOARD_SIZE}vw` : `${100 / BOARD_SIZE}vh`;

  return (
    <div
      onClick={() => {
        if (gameOver) restart();
      }}
      style={{
        position: "relative",
        fontFamily: "monospace",
        color: "var(--text-main)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: isMobile ? "100vw" : undefined,
        height: isMobile ? undefined : "100vh",
      }}
    >
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
                {isSnake && (
                  <div
                    style={{
                      width: "calc(100% - .5px)",
                      height: "calc(100% - .5px)",
                      margin: ".5px",
                      background: "var(--text-placeholder)",
                    }}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}