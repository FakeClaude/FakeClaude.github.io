// src/utils/game/Tetris.jsx
// 俄罗斯方块 —— 反转版
// 传统玩法：消除整行得分。这里不消行，堆到顶时才结算一次：
// 检查左下角或右下角，贴着棋盘边缘的直角三角形区域是否完全为空（大小任意），
// 其余地方随便堆成什么样都行。三角形边长为 k，就得 k*(k+1)/2 分（三角形数：1,3,6,10,15...）；
// 两个角都满足的话取分数更高的那个；两个角都不满足，本局 0 分。

import { useEffect, useRef, useState, useCallback } from "preact/hooks";

// ------------------------------
// 棋盘尺寸
// ------------------------------
const COLS = 10;
const ROWS = 20;

// ------------------------------
// 方块形状表（4 种：I、O、T、L），每个形状是一组 [row, col] 相对偏移
// ------------------------------
const SHAPES = {
  I: [[0, 0], [0, 1], [0, 2], [0, 3]],
  O: [[0, 0], [0, 1], [1, 0], [1, 1]],
  T: [[0, 0], [0, 1], [0, 2], [1, 1]],
  L: [[0, 0], [1, 0], [2, 0], [2, 1]],
  Z: [[0, 0], [0, 1], [1, 1], [1, 2]],
};
const SHAPE_KEYS = Object.keys(SHAPES);

// excludeKeys：不希望被抽到的形状（目前只在生成"游戏开局第一个方块"时用到，
// 排除 O/I/L 是因为这三种形状作为第一块落地后，边缘/凹角容易直接锁死后续方块进不去，
// 相当于开局就判死局；T/Z 的外形更不容易导致这种情况）
function randomShapeKey(excludeKeys = []) {
  const pool = SHAPE_KEYS.filter((k) => !excludeKeys.includes(k));
  const candidates = pool.length > 0 ? pool : SHAPE_KEYS; // 兜底：万一排完没剩，退回全集
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function createEmptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

// ------------------------------
// 抽包（bag）随机：把 5 种形状洗牌放进一个包，一次抽完再开新包。
// 目的：保证每连续 5 个方块里 I/O/T/L/Z 各出现恰好一次，杜绝纯均匀随机可能出现的
// "连续很多次抽不到某个关键形状（比如拼阶梯墙必需的竖直 I）"这种极端厄运。
// 这样只要玩家操作到位，任何一局都能在有限步数内攒够拼出 k=9 三角形（45 分）所需的形状，
// 而不用依赖"随机数运气好"。
// ------------------------------
function createShuffledBag() {
  const bag = [...SHAPE_KEYS];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

function drawFromBag(bagRef) {
  if (!bagRef.current || bagRef.current.length === 0) {
    bagRef.current = createShuffledBag();
  }
  return bagRef.current.shift();
}

function spawnPiece(bagRef) {
  const key = drawFromBag(bagRef);
  return {
    shapeKey: key,
    cells: SHAPES[key],
    row: 0,
    col: Math.floor(COLS / 2) - 1,
  };
}

// 开局第一个方块专用：排除 O、I、L。
// 注意这里故意不走抽包（bag），只是单独随机挑一个形状——
// 这样"包"从第 2 个方块才正式开始，保证之后每连续 5 个方块里 5 种形状各出现一次。
function spawnFirstPiece() {
  const key = randomShapeKey(["O", "I", "L"]);
  return {
    shapeKey: key,
    cells: SHAPES[key],
    row: 0,
    col: Math.floor(COLS / 2) - 1,
  };
}

function getAbsoluteCells(piece) {
  return piece.cells.map(([r, c]) => [piece.row + r, piece.col + c]);
}

function isValidPosition(board, piece) {
  const cells = getAbsoluteCells(piece);
  return cells.every(([r, c]) => {
    if (c < 0 || c >= COLS) return false;
    if (r >= ROWS) return false;
    if (r >= 0 && board[r][c] !== 0) return false;
    return true;
  });
}

function mergePieceToBoard(board, piece) {
  const newBoard = board.map((row) => [...row]);
  const cells = getAbsoluteCells(piece);
  cells.forEach(([r, c]) => {
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
      newBoard[r][c] = 1;
    }
  });
  return newBoard;
}

// 顺时针旋转 90 度：以形状自身外接框左上角为原点做矩阵旋转
// (r, c) -> (c, maxR - r)，O 形状旋转结果和原来一样，其余形状会正常转动
function rotateCells(cells) {
  const maxR = Math.max(...cells.map(([r]) => r));
  return cells.map(([r, c]) => [c, maxR - r]);
}

// ------------------------------
// 角落三角形空区判定：左下角或右下角，贴着棋盘边缘（左/右边界 + 底边界）的
// 直角三角形区域完全为空，就按这个三角形的格子数（三角形数 1,3,6,10,15...）计分，
// 跟棋盘其余地方堆成什么样完全无关。
//
// 关键点：三角形的斜边外面必须是"墙"（实心方块），不能只看"该空的格子是不是空的"。
// 如果只检查空格本身，一旦旁边恰好也空着，会被贪心算法误判成更大的三角形，分数虚高
// ——这不是真正意义上的"阶梯形状"，只是碰巧一片矩形区域是空的，两者视觉上完全不同。
//
// 用 i 表示"从底往上数第几行"（i=0 是最底行），三角形边长为 k 时：
// - 左下角：第 i 行(i=0..k-1) 要求列 0..(k-1-i) 必须空，且再往右一格(列 k-i，如果没超出棋盘)
//   必须是实心方块——这一格就是这一层台阶的"墙"，确保是真正封口的阶梯，而不是恰好空着
// - 右下角：同理镜像，往左一格是墙
// ------------------------------
function isBottomLeftTriangleEmpty(board, k) {
  for (let i = 0; i < k; i++) {
    const row = ROWS - 1 - i;
    const maxEmptyCol = k - 1 - i; // 这一行要求 0..maxEmptyCol 都空
    for (let c = 0; c <= maxEmptyCol; c++) {
      if (board[row][c] !== 0) return false;
    }
    const wallCol = k - i; // 空区再往右一格，应该是墙
    if (wallCol <= COLS - 1 && board[row][wallCol] === 0) {
      return false; // 墙的位置也是空的，说明这层没封口，不是真正的三角形
    }
  }
  // 封顶检查：三角形正上方那一行、最外侧那一列（col 0）必须是实心，
  // 否则最深的角是一条向上开放的竖井，不是真正封闭的阶梯口袋
  const topRow = ROWS - 1 - k;
  if (topRow >= 0 && board[topRow][0] === 0) {
    return false;
  }
  return true;
}

function isBottomRightTriangleEmpty(board, k) {
  for (let i = 0; i < k; i++) {
    const row = ROWS - 1 - i;
    const minEmptyCol = COLS - k + i; // 这一行要求 minEmptyCol..COLS-1 都空
    for (let c = minEmptyCol; c < COLS; c++) {
      if (board[row][c] !== 0) return false;
    }
    const wallCol = minEmptyCol - 1; // 空区再往左一格，应该是墙
    if (wallCol >= 0 && board[row][wallCol] === 0) {
      return false; // 墙的位置也是空的，说明这层没封口，不是真正的三角形
    }
  }
  // 封顶检查：三角形正上方那一行、最外侧那一列（col COLS-1）必须是实心，
  // 否则最深的角是一条向上开放的竖井，不是真正封闭的阶梯口袋
  const topRow = ROWS - 1 - k;
  if (topRow >= 0 && board[topRow][COLS - 1] === 0) {
    return false;
  }
  return true;
}

// 三角形数：边长为 k 的直角三角形一共有 k*(k+1)/2 个格子，得分就是这个数
function triangleNumber(k) {
  return (k * (k + 1)) / 2;
}

// 找左下角/右下角各自能满足的最大三角形边长，取分数更高的那个，
// 同时返回是哪一侧（left/right），供闪光动效知道要点亮哪些格子坐标
function getStaircaseResult(board) {
  const maxK = Math.min(ROWS, COLS);
  let bestLeft = 0;
  for (let k = maxK; k >= 1; k--) {
    if (isBottomLeftTriangleEmpty(board, k)) {
      bestLeft = k;
      break;
    }
  }
  let bestRight = 0;
  for (let k = maxK; k >= 1; k--) {
    if (isBottomRightTriangleEmpty(board, k)) {
      bestRight = k;
      break;
    }
  }
  if (bestLeft === 0 && bestRight === 0) return { k: 0, side: null };
  return bestLeft >= bestRight ? { k: bestLeft, side: "left" } : { k: bestRight, side: "right" };
}

// 根据边长 k 和方向，算出这个三角形具体占哪些 [row, col] 格子（用于闪光高亮）
function getTriangleCells(k, side) {
  const cells = [];
  for (let i = 0; i < k; i++) {
    const row = ROWS - 1 - i;
    if (side === "left") {
      const maxCol = k - 1 - i;
      for (let c = 0; c <= maxCol; c++) cells.push([row, c]);
    } else {
      const minCol = COLS - k + i;
      for (let c = minCol; c < COLS; c++) cells.push([row, c]);
    }
  }
  return cells;
}

// ------------------------------
// 组件
// ------------------------------
export default function Tetris({ initialToken = 0, onTokenChange }) {
  const [board, setBoard] = useState(createEmptyBoard);
  const [piece, setPiece] = useState(spawnFirstPiece);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const intervalRef = useRef(null);
  const boardRef = useRef(null);
  const bagRef = useRef([]); // 抽包状态：当前包里还没抽出的形状队列
  // token 余额跟随外部传入的 initialToken；只展示（不参与游戏逻辑），
  // 堆到顶结算时把三角形分数直接加到这个值上，再通过 onTokenChange 回传给上层
  const tokenRef = useRef(initialToken);
  useEffect(() => {
    tokenRef.current = initialToken;
  }, [initialToken]);
  // 得分那一刻，需要闪绿光的格子坐标集合（"row-col" 字符串），动画播完（600ms）后清空
  const [flashCells, setFlashCells] = useState(() => new Set());
  // 移动端检测：粗指针（触屏）即认为是移动端，用来切换画布尺寸和触摸手势
  const [isMobile] = useState(() =>
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(pointer: coarse)").matches
      : false
  );

  // 固定当前方块、生成下一个；若新方块一出生就冲突，说明堆到顶了 —— 结算一次阶梯判定
  const lockPieceAndSpawnNext = useCallback((prevBoard, prevPiece) => {
    const merged = mergePieceToBoard(prevBoard, prevPiece);
    const next = spawnPiece(bagRef);
    if (!isValidPosition(merged, next)) {
      setGameOver(true);
      const result = getStaircaseResult(merged);
      const gained = triangleNumber(result.k);
      if (gained > 0) {
        setScore((s) => s + gained);
        // 三角形分数直接加到 token 上，回传给上层（game.jsx）去更新真实 token 余额
        const newToken = tokenRef.current + gained;
        tokenRef.current = newToken;
        onTokenChange?.(newToken, gained);
        // 点亮得分的三角形区域，闪一下绿光，600ms 后自动熄灭
        const cells = getTriangleCells(result.k, result.side);
        setFlashCells(new Set(cells.map(([r, c]) => `${r}-${c}`)));
        setTimeout(() => setFlashCells(new Set()), 600);
      }
      setBoard(merged);
      return prevPiece; // 游戏结束，piece 保持不变即可
    }
    setBoard(merged);
    return next;
  }, []);

  const step = useCallback(() => {
    setBoard((prevBoard) => {
      setPiece((prevPiece) => {
        const moved = { ...prevPiece, row: prevPiece.row + 1 };
        if (isValidPosition(prevBoard, moved)) {
          return moved;
        }
        return lockPieceAndSpawnNext(prevBoard, prevPiece);
      });
      return prevBoard;
    });
  }, [lockPieceAndSpawnNext]);

  const moveLeft = useCallback(() => {
    setBoard((prevBoard) => {
      setPiece((prevPiece) => {
        const moved = { ...prevPiece, col: prevPiece.col - 1 };
        return isValidPosition(prevBoard, moved) ? moved : prevPiece;
      });
      return prevBoard;
    });
  }, []);

  const moveRight = useCallback(() => {
    setBoard((prevBoard) => {
      setPiece((prevPiece) => {
        const moved = { ...prevPiece, col: prevPiece.col + 1 };
        return isValidPosition(prevBoard, moved) ? moved : prevPiece;
      });
      return prevBoard;
    });
  }, []);

  const rotate = useCallback(() => {
    setBoard((prevBoard) => {
      setPiece((prevPiece) => {
        const rotated = { ...prevPiece, cells: rotateCells(prevPiece.cells) };
        return isValidPosition(prevBoard, rotated) ? rotated : prevPiece;
      });
      return prevBoard;
    });
  }, []);

  // 左右移动 / 旋转（方向键上或空格）/ 加速下落
  useEffect(() => {
    function handleKey(e) {
      if (gameOver) return;
      if (e.code === "ArrowLeft") {
        e.preventDefault();
        moveLeft();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        moveRight();
      } else if (e.code === "ArrowUp" || e.code === "Space") {
        e.preventDefault();
        rotate();
      } else if (e.code === "ArrowDown") {
        e.preventDefault();
        step();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [step, moveLeft, moveRight, rotate, gameOver]);

  useEffect(() => {
    if (gameOver) {
      clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(step, 500); // 每 500ms 自然下落一格
    return () => clearInterval(intervalRef.current);
  }, [step, gameOver]);

  // 移动端触摸手势：按图示把棋盘区域用两条对角线分成上/下/左/右四个三角区
  // 上=转砖块 下=下移 左=左移 右=右移，不显示任何视觉提示
  useEffect(() => {
    if (!isMobile) return;
    const el = boardRef.current;
    if (!el) return;

    function handleTouchStart(e) {
      if (gameOver) return;
      const touch = e.touches[0];
      if (!touch) return;
      const rect = el.getBoundingClientRect();
      const dx = touch.clientX - (rect.left + rect.width / 2);
      const dy = touch.clientY - (rect.top + rect.height / 2);

      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) {
          moveLeft();
        } else {
          moveRight();
        }
      } else {
        if (dy < 0) {
          rotate();
        } else {
          step();
        }
      }
    }

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    return () => el.removeEventListener("touchstart", handleTouchStart);
  }, [isMobile, moveLeft, moveRight, rotate, step, gameOver]);

  // ------------------------------
  // 渲染
  // ------------------------------
  const displayBoard = board.map((row) => [...row]);
  if (!gameOver) {
    getAbsoluteCells(piece).forEach(([r, c]) => {
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
        displayBoard[r][c] = 2; // 2 = 当前下落方块
      }
    });
  }

  const cellSize = isMobile ? `${100 / COLS}vw` : "5vh";

  return (
    <div
      style={{
        fontFamily: "monospace",
        color: "var(--text-main)",
        display: "flex",
        justifyContent: "center",
        alignItems: isMobile ? "flex-end" : "center",
        width: isMobile ? "100vw" : undefined,
        height: isMobile ? "100vh" : undefined,
      }}
    >
      <div
        ref={boardRef}
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, ${cellSize})`,
          gridTemplateRows: `repeat(${ROWS}, ${cellSize})`,
          gap: "0",
          background: "var(--line)",
          width: isMobile ? "100vw" : "fit-content",
        }}
      >
        <style>{`
          @keyframes tetrisScoreFlash {
            0% { opacity: 0.5; }
            100% { opacity: 0; }
          }
          .tetris-flash-overlay {
            position: absolute;
            inset: 1px;
            background: var(--green);
            animation: tetrisScoreFlash 1s ease-out forwards;
            pointer-events: none;
          }
        `}</style>
        {displayBoard.flatMap((row, r) =>
          row.map((cell, c) => (
            <div
              key={`${r}-${c}`}
              data-row={r}
              data-col={c}
              style={{
                position: "relative",
                width: cellSize,
                height: cellSize,
                border: ".5px solid var(--line)",
                background: "var(--card-bg)",
                boxSizing: "border-box",
              }}
            >
              {cell !== 0 && (
                <div
                  style={{
                    width: "calc(100% - .5px)",
                    height: "calc(100% - .5px)",
                    margin: ".5px",
                    background: cell === 2 ? "var(--accent)" : "var(--text-placeholder)",
                  }}
                />
              )}
              {flashCells.has(`${r}-${c}`) && <div className="tetris-flash-overlay" />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}