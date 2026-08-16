import { useEffect, useRef, useState, useCallback } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { idb } from "../IndexedDB";
import {
  useDirectionInput,
  DPadKey,
  DPAD_SIZE,
  DPAD_SCALE,
  DPAD_LAYOUT,
  DPAD_DEAD_ZONE
} from "../gameKeyboard";
const GRID_SIZE = 21;
const CELL_SIZE = 30;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE; // 630px
const R = 4; // 弧线半径
const SNAKE_WIDTH = 24;
const SNAKE_SPEED = 120; // 像素/秒
// 停靠时在"格子正中心"基础上，再往行进方向多探多少像素。0=正中心，正数=更往前，负数=往回收
const HEAD_LAND_OFFSET = -8;
const SEGMENT_SPACING = 8;
// 仅用于描边渲染的采样间距。必须明显小于转弯圆弧弧长(约 R*π/2 ≈ 6.28px)，
// 否则用 SEGMENT_SPACING(8px) 采样时，圆弧上"有没有采样点"会随头部移动的相位随机变化，
// 导致转弯处的轮廓在"有弧线"和"直线抄近路"之间逐帧跳变——这才是转弯抖动闪烁的根源。
const RENDER_SPACING = 2;
// 每个格子(30px)对应的身体节点数：CELL_SIZE / SEGMENT_SPACING，用于把"需要占满N个格子"换算成实际身体节点数
const CELLS_TO_SEGMENTS = CELL_SIZE / SEGMENT_SPACING;
// 圆头/圆尾(lineCap:'round')会让视觉总长比中心线路径多出SNAKE_WIDTH(两端各凸出半个线宽)，需扣除该误差
const INITIAL_SEGMENTS = Math.max(1, Math.round((8 * CELL_SIZE - SNAKE_WIDTH - CELL_SIZE) / SEGMENT_SPACING) + 1); // 开局视觉长度精确等于8格（在原公式基础上减去约1格的观测偏差）
// 重开/读档后的无敌保护期时长（ms）：期间跳过自碰撞检测，同时蛇身按闪烁透明度提示"无敌中"
const GRACE_DURATION = 1000;
const FOOD_RADIUS = 7;
// 主题色格子按关卡显示的动物：第1圈🐭 ... 第7圈🐳，超过7圈沿用🐳
const TARGET_EMOJIS = ['🐭', '🐔', '🐑', '🐄', '🐫', '🐘', '🐳'];
// 最高关卡数：达到后不再继续增长（box大小/emoji数量/奖励/分值都封顶），
// 之后每次过关只重新生成布局（换box位置+emoji排列），关卡数保持不变
const MAX_LEVEL = 9;

// 方向：0:右, 1:下, 2:左, 3:上
const DIRS = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: -1 }
];

// 生成开局用的初始 trail：从 head 位置沿 dir 反方向铺开足够多的点，
// 让蛇一开始就是满长度静止显示，不再需要"自动走出来"的动画（因为蛇不再自动行走）
function buildInitialTrail(head, dir, segmentFloat) {
  const d = DIRS[dir];
  const steps = Math.ceil(segmentFloat) + 2; // 多铺一点余量
  const trail = [];
  for (let i = 0; i <= steps; i++) {
    trail.push({
      x: (head.x - d.x * i * SEGMENT_SPACING + CANVAS_SIZE) % CANVAS_SIZE,
      y: (head.y - d.y * i * SEGMENT_SPACING + CANVAS_SIZE) % CANVAS_SIZE
    });
  }
  return trail;
}

const getCellCenter = (col, row) => ({
  x: (col + 0.5) * CELL_SIZE,
  y: (row + 0.5) * CELL_SIZE
});

// 像素坐标 -> 最近网格坐标（用于把连续运动的身体节点映射回格子做包围判定）
const pixelToGrid = (x, y) => ({
  col: (Math.floor(x / CELL_SIZE) + GRID_SIZE) % GRID_SIZE,
  row: (Math.floor(y / CELL_SIZE) + GRID_SIZE) % GRID_SIZE
});

// 第 n 关高对比度格子（box）的边长：1 + 2n
const boxSize = (n) => 1 + 2 * n;
// 第 n 关 box 内需要占满的格子总数（不含 emoji 占用的格子）
const requiredCellCount = (n) => boxSize(n) * boxSize(n) - n;
// 完成第 n 关后蛇身增长多少格（格子数，非身体节点数，使用时需乘 CELLS_TO_SEGMENTS 换算）：
// 在老公式 8*(n+1) 的基础上再减少若干格，减少量按关卡递增：1,1,2,2,3,3...（即 ceil(n/2)）
// 对应：第1关 16-1=15，第2关 24-1=23，第3关 32-2=30，以此类推
const rewardLength = (n) => 8 * (n + 1) - Math.ceil(n / 2);
// 每关得分/扣分：10、50、100、200、300...
const scoreForLevel = (n) => (n === 1 ? 10 : n === 2 ? 50 : 100 * (n - 2));

// box 内所有格子坐标（左上角 col0,row0，边长 size），不跨越棋盘边界、不支持穿墙取模
function getBoxCells(col0, row0, size) {
  const cells = [];
  for (let dr = 0; dr < size; dr++) {
    for (let dc = 0; dc < size; dc++) {
      cells.push({ col: col0 + dc, row: row0 + dr });
    }
  }
  return cells;
}

// ===== 分圈构造法（构造式生成，非"生成+验证"）=====
// box 边长 = 1+2n，天然是 n+1 层同心圈：第0圈(最外圈，不挖洞) ... 第n-1圈(挨着中心)，
// 再加一个中心点(第n圈，恰好1格)。核心数学事实：一个正方形"环"去掉其中一格后，
// 剩下部分必然变成一条链，链的两个端点正是这个洞左右相邻的两个格子——
// 这是环的拓扑结构决定的，不需要另外验证。
//
// 算法从最外圈开始，逐圈往里"缝合"：
//   1) 最外圈无洞，可以完整走一圈，自由选一个不落在角上的起点，走完停在起点前一格(exit)；
//   2) 从 exit 找它径向朝内一格的邻居，作为下一圈的 entry；
//   3) 下一圈的洞只能挖在 entry 的左邻居或右邻居两者之一（这样 entry 才恰好是链的端点）；
//      两个候选各自决定链另一端(exit)落在哪，优先选不落在角上的那个（角格没有沿网格方向
//      直接指向内圈的邻居，没法再往里缝合），两个都不落角时随机挑一个，增加视觉随机度；
//   4) 重复直到最内一圈(边长3)，其 exit 必然正对中心格，最后把中心格也标记为洞。
// 整个过程只走一遍每个格子，O(box 周长总和)，没有回溯、没有重试，天然保证可解。

// 第 k 圈（k=0 为最外圈）在 box 内的四角坐标
function ringCorners(col0, row0, size, k) {
  const top = row0 + k;
  const bottom = row0 + size - 1 - k;
  const left = col0 + k;
  const right = col0 + size - 1 - k;
  return { top, bottom, left, right };
}

// 第 k 圈按顺时针排好序的格子列表（size-2k===1 时只有中心一格）
function ringCellsOrdered(col0, row0, size, k) {
  const { top, bottom, left, right } = ringCorners(col0, row0, size, k);
  if (top === bottom && left === right) return [{ col: left, row: top }]; // 中心点
  const cells = [];
  for (let c = left; c <= right; c++) cells.push({ col: c, row: top }); // 上边：左→右
  for (let r = top + 1; r <= bottom; r++) cells.push({ col: right, row: r }); // 右边：上→下
  if (bottom > top) {
    for (let c = right - 1; c >= left; c--) cells.push({ col: c, row: bottom }); // 下边：右→左
  }
  if (right > left) {
    for (let r = bottom - 1; r >= top + 1; r--) cells.push({ col: left, row: r }); // 左边：下→上
  }
  return cells;
}

function isRingCorner(cell, col0, row0, size, k) {
  const { top, bottom, left, right } = ringCorners(col0, row0, size, k);
  return (cell.col === left || cell.col === right) && (cell.row === top || cell.row === bottom);
}

// 非角格 cell 沿"径向朝内"一步的邻居（角格没有合法的单步径向邻居，调用前必须保证非角）
function radialInward(cell, col0, row0, size, k) {
  const { top, bottom, left, right } = ringCorners(col0, row0, size, k);
  if (cell.row === top) return { col: cell.col, row: cell.row + 1 };
  if (cell.row === bottom) return { col: cell.col, row: cell.row - 1 };
  if (cell.col === left) return { col: cell.col + 1, row: cell.row };
  return { col: cell.col - 1, row: cell.row }; // cell.col === right
}

// 生成第 n 关的 box 左上角坐标：边长 boxSize(n)，不超出棋盘边界（不穿墙）
function spawnBoxPosition(level) {
  const size = boxSize(level);
  const maxStart = GRID_SIZE - size;
  const col0 = Math.floor(Math.random() * (maxStart + 1));
  const row0 = Math.floor(Math.random() * (maxStart + 1));
  return { col: col0, row: row0, size };
}

// 从第 k 圈开始，尝试以 exitCell（上一圈缝合过来的入口所在格）为起点，一路构造到中心。
// 每圈的洞只有"挖左邻居/挖右邻居"两种选择：多数情况下至少一种能让 exit 落在非角格上，
// 但边长恰好为5的圈里，如果 entry 恰好落在某条边的正中间，两种选择会同时落在角上
// （这是真实会发生的情况，出现概率约1/4，不是可以忽略的极端情况）。
// 一旦某一圈两种选择都行不通，说明"上一圈选的那个 exit"这步选错了，需要回溯到上一圈换
// 另一种选择重试。回溯的范围只在"每圈挖左边还是挖右边"这 n 个二元选择之间，
// 和棋盘格子级别的搜索完全不是一个量级：最多 n 层、每层分支2，n 受限于棋盘大小（≤10），
// 最坏 2^10=1024 种组合，每种只需 O(圈周长) 的代数计算，不会造成卡顿。
// 把 cell 绕 box 中心做180°点反射(size为奇数，2*col+size-1恒为整数)
function reflectCell(cell, col, row, size) {
  return { col: col * 2 + size - 1 - cell.col, row: row * 2 + size - 1 - cell.row };
}

function buildFromRing(k, exitCell, col, row, size, n, prevHole) {
  if (k > n - 1) {
    const centerHole = { col: col + n, row: row + n };
    if (prevHole && (centerHole.col === prevHole.col || centerHole.row === prevHole.row)) return null;
    return [centerHole];
  }

  const ring = ringCellsOrdered(col, row, size, k);
  const m = ring.length;
  const entryCell = radialInward(exitCell, col, row, size, k - 1);
  const entryIdx = ring.findIndex((p) => p.col === entryCell.col && p.row === entryCell.row);

  const candidates = [
    { holeIdx: (entryIdx - 1 + m) % m, exitIdx: (entryIdx - 2 + m) % m },
    { holeIdx: (entryIdx + 1) % m, exitIdx: (entryIdx + 2) % m }
  ].sort(() => Math.random() - 0.5); // 顺序随机，增加"挖左边还是右边"的随机感

  for (const c of candidates) {
    const exitCandidate = ring[c.exitIdx];
    if (isRingCorner(exitCandidate, col, row, size, k)) continue;
    const holeCell = ring[c.holeIdx];
    if (prevHole && (holeCell.col === prevHole.col || holeCell.row === prevHole.row)) continue;
    const rest = buildFromRing(k + 1, exitCandidate, col, row, size, n, holeCell);
    if (rest) return [holeCell, ...rest];
  }
  return null; // 两种挖法都不通：回溯给上一圈，让它换另一种挖法
}

// 分圈构造出 n 个 emoji 的位置（详见上方大段注释）。核心是代数计算+数组下标操作，
// 唯一的搜索只发生在"每圈挖左边还是挖右边"这 n 个二元选择之间，复杂度恒定且极小，
// 不是棋盘格子级别的搜索，不会造成卡顿。
function buildRingEmojis(box, n) {
  const { col, row, size } = box;

  // 第0圈(最外圈)：无洞，可以完整走一圈，走到哪里停下都行——随机挑一个非角格作为 exit
  // （等价于把"起点"定在这个格子的下一格，从那里绕一整圈回到这里）。多试几个不同的
  // 非角格作为 exit，任何一个能让后续所有圈都缝合成功就采用。
  const ring0 = ringCellsOrdered(col, row, size, 0);
  const safeExit0 = ring0
    .map((_, idx) => idx)
    .filter((idx) => !isRingCorner(ring0[idx], col, row, size, 0))
    .sort(() => Math.random() - 0.5);

  // 每个 emoji（对应从外到内的每一圈）是否做轴反射，逐圈独立决定——
  // 但不是逐个各自随机（那样会破坏链式缝合，导致不可解），而是按圈的奇偶交替：
  // 相邻两圈的反射状态必然相反，只有"整体从哪个奇偶开始"是随机的，用来增加每局的视觉变化。
  // emojis 数组里最后一个元素固定是中心点格子，中心点本身不参与反射（反射它也还是它自己）。
  const maybeReflect = (emojis) => {
    const startReflect = Math.random() < 0.5; // 随机决定第0圈(最外层洞所在圈)是否反射，后续圈依次交替
    return emojis.map((cell, ringIdx) => {
      const isCenter = ringIdx === emojis.length - 1;
      if (isCenter) return cell;
      const doReflect = ringIdx % 2 === 0 ? startReflect : !startReflect;
      return doReflect ? reflectCell(cell, col, row, size) : cell;
    });
  };

  for (const idx of safeExit0) {
    const result = buildFromRing(1, ring0[idx], col, row, size, n, null);
    if (result) return maybeReflect(result);
  }
  // 理论上不会走到这里：第0圈的非角格选择足够多，且回溯覆盖了所有二元组合
  return maybeReflect([{ col: col + n, row: row + n }]);
}

// 生成第 n 关的 box + emoji 布局：box 随机放置（避免和上一关重复），emoji 用分圈构造法
// 直接构造出保证可解的位置，不需要事后校验、不需要重试。
function spawnBoxAndEmojis(level, prevBoxKey) {
  const n = level;
  const MAX_BOX_ATTEMPTS = 5; // 仅用于"别和上一关的 box 重复"，与可解性无关
  let box = spawnBoxPosition(level);
  for (let attempt = 1; attempt < MAX_BOX_ATTEMPTS; attempt++) {
    const boxKey = `${box.col}-${box.row}-${box.size}`;
    if (boxKey !== prevBoxKey) break;
    box = spawnBoxPosition(level);
  }
  const emojis = buildRingEmojis(box, n);
  return { box, emojis };
}

// 用 1x1 离屏 canvas 把任意 CSS 颜色字符串（hex/rgb/named 等）解析成 [r,g,b]，
// 这样不用自己写颜色格式解析器，交给浏览器处理
let _colorProbeCtx = null;
function resolveRGB(cssColor) {
  if (!_colorProbeCtx) {
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    _colorProbeCtx = c.getContext('2d', { willReadFrequently: true });
  }
  _colorProbeCtx.fillStyle = '#000';
  _colorProbeCtx.fillStyle = cssColor;
  _colorProbeCtx.fillRect(0, 0, 1, 1);
  const [r, g, b] = _colorProbeCtx.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

const mixToward = ([r, g, b], target, factor) => [
  r + (target - r) * factor,
  g + (target - g) * factor,
  b + (target - b) * factor
];
const rgbCss = ([r, g, b]) => `rgb(${r}, ${g}, ${b})`;
const luminance = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b;

// 把棋盘的两个基础色，在"提示范围"内对比度拉高：较亮的颜色再调亮，较暗的颜色再调暗，
// factor 控制拉开幅度（0.5 = 各自往白/黑方向混合 50%）
function boostContrast(colorA, colorB, factor = 0.5) {
  const rgbA = resolveRGB(colorA);
  const rgbB = resolveRGB(colorB);
  const aIsLighter = luminance(rgbA) >= luminance(rgbB);
  const lightRgb = aIsLighter ? rgbA : rgbB;
  const darkRgb = aIsLighter ? rgbB : rgbA;
  const boostedLight = mixToward(lightRgb, 255, factor);
  const boostedDark = mixToward(darkRgb, 0, factor);
  return aIsLighter
    ? [rgbCss(boostedLight), rgbCss(boostedDark)]
    : [rgbCss(boostedDark), rgbCss(boostedLight)];
}

// 移动端检测：粗指针（触屏）即认为是移动端，用来切换外层容器定位方式（与 SnakeOrbit_old 保持一致）
function useIsMobile() {
  const [isMobile] = useState(
    () => typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)").matches
  );
  return isMobile;
}

// 进度存档：读取/写入 FakeClaudeDB.replies.game 下的 SnakeOrbit 字段。
// 存的是完整连续坐标状态（而非离散格子），这样重开/刷新后能精确复原到
// 上一次"包围成功、身体闪烁"那一帧的画面与逻辑，而不是重新拼一个近似的姿态。
async function loadSnakeOrbitProgress() {
  try {
    const saved = await idb.get('game');
    return saved && saved.SnakeOrbit ? saved.SnakeOrbit : null;
  } catch (e) {
    return null;
  }
}

async function saveSnakeOrbitProgress(snapshot) {
  try {
    const saved = await idb.get('game');
    await idb.set('game', { ...(saved || {}), SnakeOrbit: snapshot });
  } catch (e) {
    // 存档失败不影响正常游戏进行
  }
}

// 把一份存档快照还原成 gameState.current 需要的形状
function stateFromSnapshot(snapshot) {
  return {
    head: { x: snapshot.head.x, y: snapshot.head.y },
    dir: snapshot.dir,
    inputQueue: [],
    mode: snapshot.mode,
    targetGrid: { ...snapshot.targetGrid },
    arc: snapshot.arc ? { ...snapshot.arc } : null,
    trail: snapshot.trail.map(p => ({ x: p.x, y: p.y })),
    segmentCount: snapshot.segmentCount,
    segmentFloat: snapshot.segmentFloat,
    pendingGrowth: snapshot.pendingGrowth,
    level: snapshot.level,
    box: { ...snapshot.box },
    emojis: (snapshot.emojis || []).map(p => ({ ...p })),
    flashStart: null,
    lastTime: performance.now(),
    // 重开/读档后的短暂保护期：避免读到"刚好包围成功那一瞬"的存档时，
    // 身体本就贴近自身，稍一移动就被自碰撞判负
    graceUntil: performance.now() + GRACE_DURATION,
    stepBudget: 0, // 待走的格步数是瞬时输入状态，不持久化，读档后从静止开始
    coasting: false,
    coastTarget: null
  };
}
export default function SnakeOrbit({ initialToken = 0, onTokenChange }) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const canvasRef = useRef(null);
  const panelRef = useRef(null);
  // 虚拟方向键(D-pad)按钮通过这个 ref 调用游戏循环 effect 里定义的 pressDir/releaseDir，
  // 因为按钮是在 JSX 里渲染的，和游戏循环 effect 不在同一个作用域；effect 每次重跑时
  // (依赖 [gameOver, isReady]) 都会把最新的 press/release 函数写进这个 ref。
  const dpadRef = useRef({ press: () => {}, release: () => {} });
  // 记录当前每个触摸点(pointerId)对应的方向：支持多指同时按住不同方向键
  const dpadPointersRef = useRef(new Map());
  // 游戏循环 effect 每次重跑时会把当前作用域里最新的 queueDir 写进这个 ref，
  // 供组件顶层的 useDirectionInput（键盘/长按逻辑已抽到 gameKeyboard.js）调用
  const queueDirRef = useRef(() => {});
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [isReady, setIsReady] = useState(false); // 存档读取完成前不启动游戏循环，避免闪一下默认局面
  // 移动端虚拟方向键：记录当前被按下的按钮(视觉反馈用)——哪个方向的键正被手指按住，
  // 就给它加"右下偏移1px + 对比度提升"的按压效果
  const [pressedDpad, setPressedDpad] = useState(() => new Set());
  const tokenRef = useRef(initialToken);

  useEffect(() => {
    tokenRef.current = initialToken;
  }, [initialToken]);

  const applyScoreDelta = useCallback(
    (delta) => {
      setScore((s) => s + delta);
      tokenRef.current += delta;
      onTokenChange?.(tokenRef.current, delta);
    },
    [onTokenChange]
  );
  // 用 ref 保存最新的 applyScoreDelta：游戏循环 effect 通过 ref 调用它，
  // 这样 onTokenChange 引用变化（如父组件因 token 数字动画频繁重渲染）不会导致
  // 游戏循环 effect（含 canvas 动画帧、键盘监听等）被销毁重建，避免画布闪烁
  const applyScoreDeltaRef = useRef(applyScoreDelta);
  useEffect(() => {
    applyScoreDeltaRef.current = applyScoreDelta;
  }, [applyScoreDelta]);

  const startHeadInitial = { x: getCellCenter(10, 10).x - R, y: getCellCenter(10, 10).y };
  const gameState = useRef({
    head: startHeadInitial,
    dir: 0,
    inputQueue: [],
    mode: 'STRAIGHT',
    targetGrid: { col: 10, row: 10 },
    arc: null,
    trail: buildInitialTrail(startHeadInitial, 0, INITIAL_SEGMENTS),
    segmentCount: INITIAL_SEGMENTS,
    segmentFloat: INITIAL_SEGMENTS,
    pendingGrowth: 0,
    level: 1,
    box: { col: 9, row: 9, size: 3 },
    emojis: [{ col: 10, row: 10 }],
    flashStart: null,
    lastTime: performance.now(),
    stepBudget: 0, // 待走的"格步"数：0表示静止，仅在有输入(点击/按住)时才 > 0
    coasting: false, // 额度耗尽但还没真正到达落点时为true，期间头部继续动画滑到落点，而不是瞬间跳过去
    coastTarget: null
  });
  window.__gs = gameState; // 临时调试用，导出布局后请删除

  // 为第 level 关生成新的 box + emoji 布局（n 个 emoji 共用同一块高对比度 box）
  const spawnTarget = (level) => {
    const prevBox = gameState.current.box;
    const prevBoxKey = prevBox ? `${prevBox.col}-${prevBox.row}-${prevBox.size}` : null;
    const { box, emojis } = spawnBoxAndEmojis(level, prevBoxKey);
    gameState.current.box = box;
    gameState.current.emojis = emojis;
  };
  window.__spawnTarget = spawnTarget; // 临时调试用，导出布局后请删除
  window.__setLevel = setLevel; // 临时调试用，导出布局后请删除

  const resetGame = async () => {
    const snapshot = await loadSnakeOrbitProgress();
    if (snapshot) {
      gameState.current = stateFromSnapshot(snapshot);
      setLevel(snapshot.level);
    } else {
      const startHead = { x: getCellCenter(10, 10).x - R, y: getCellCenter(10, 10).y };
      gameState.current = {
        head: startHead,
        dir: 0,
        inputQueue: [],
        mode: 'STRAIGHT',
        targetGrid: { col: 10, row: 10 },
        arc: null,
        trail: buildInitialTrail(startHead, 0, INITIAL_SEGMENTS),
        segmentCount: INITIAL_SEGMENTS,
        segmentFloat: INITIAL_SEGMENTS,
        pendingGrowth: 0,
        level: 1,
        box: { col: 9, row: 9, size: 3 },
        emojis: [{ col: 10, row: 10 }],
        flashStart: null,
        lastTime: performance.now(),
        graceUntil: performance.now() + GRACE_DURATION,
        stepBudget: 0,
        coasting: false,
        coastTarget: null
      };
      spawnTarget(1);
      setScore(0);
      setLevel(1);
    }
    setGameOver(false);
  };

  // 上下左右 + 长按连续走的通用输入逻辑（键盘 & 虚拟方向键共用），已抽到 gameKeyboard.js
  const directionInput = useDirectionInput(
    {
      enabled: isReady,
      gameOver,
      onGameOver: resetGame,
      onQueueDir: (dir) => queueDirRef.current(dir),
      onStepBudget: (delta) => {
        gameState.current.stepBudget += delta;
      },
      dpadRef
    },
    [gameOver, isReady]
  );
  const directionInputRef = useRef(directionInput);
  directionInputRef.current = directionInput;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const snapshot = await loadSnakeOrbitProgress();
      if (cancelled) return;
      if (snapshot) {
        gameState.current = stateFromSnapshot(snapshot);
        setLevel(snapshot.level);
      } else {
        spawnTarget(1);
      }
      setIsReady(true);
    })();

    return () => {
      cancelled = true;
    };
    // 只在组件首次挂载时读取一次存档
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isReady) return undefined;

    // canvas显示尺寸现在由外层响应式CSS决定（不同设备下不一样），
    // 内部渲染分辨率需要跟着实际显示尺寸动态计算，而不是固定用630px乘一个倍数——
    // 否则显示尺寸远小于固定分辨率时（比如手机上面板远小于桌面的630px），
    // 缩放压缩比过大会让1px网格线在下采样时丢失/变淡，看起来像格子变少了。
    // 这里用 ResizeObserver 监听面板实际渲染尺寸变化，重新设置canvas的像素缓冲区，
    // 并用 scale 把绘图逻辑坐标系（始终是 0~CANVAS_SIZE）映射到新的缓冲区分辨率。
    const canvasEl = canvasRef.current;
    const syncCanvasResolution = () => {
      if (!canvasEl) return;
      const rect = canvasEl.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const dpr = window.devicePixelRatio || 1;
      const nextWidth = Math.round(rect.width * dpr);
      const nextHeight = Math.round(rect.height * dpr);
      // 给 canvas.width/height 赋值会清空画布内容，哪怕值和原来一样——
      // 所以尺寸没变时直接跳过，避免游戏结束等状态变化触发 effect 重跑时把最后一帧清没了
      if (canvasEl.width === nextWidth && canvasEl.height === nextHeight) return;
      canvasEl.width = nextWidth;
      canvasEl.height = nextHeight;
      const scaleFactor = canvasEl.width / CANVAS_SIZE;
      const ctx = canvasEl.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(scaleFactor, scaleFactor);
    };

    syncCanvasResolution();
    let resizeObserver;
    if (canvasEl && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => syncCanvasResolution());
      resizeObserver.observe(canvasEl);
    }

    // 键盘和触摸共用的方向输入处理
    const queueDir = (newDir) => {
      const state = gameState.current;
      const queue = state.inputQueue;

      // 计算当前规划链条上的最后一个目标方向
      let lastPlannedDir = state.dir;
      if (queue.length > 0) {
        lastPlannedDir = queue[queue.length - 1];
      } else if (state.mode === 'ARC' && state.arc) {
        lastPlannedDir = state.arc.targetDir;
      }

      // 过滤与规划方向相同或180度反向的指令，保持队列上限为 2
      if (newDir !== lastPlannedDir && (newDir + 2) % 4 !== lastPlannedDir) {
        if (queue.length < 2) {
          queue.push(newDir);
        }
      }
    };
    // 供 useDirectionInput（组件顶层的方向输入 hook）调用：这个 effect 每次重跑
    // (依赖 [gameOver, isReady]) 都会把最新的 queueDir 写进 ref
    queueDirRef.current = queueDir;

    let animationFrameId;

    const gameLoop = (time) => {
      animationFrameId = requestAnimationFrame(gameLoop);
      if (gameOver) return;

      const dt = Math.min((time - gameState.current.lastTime) / 1000, 0.1);
      gameState.current.lastTime = time;

      const state = gameState.current;
      window.__snakeState = state;
      //window.__snakeState 控制台获取emoji坐标
      // 按住方向键超过阈值时长后，每帧都把 stepBudget 补到至少 1，让蛇持续走；
      // 松开后不再补充，stepBudget 会随着走完当前这一格自然耗尽到 0，蛇随即停下。
      if (directionInputRef.current.getHeldDir(time) !== null) {
        state.stepBudget = Math.max(state.stepBudget, 1);
      }
      // stepBudget <= 0 时蛇完全静止（remainingDist = 0），不再自动行走
      // stepBudget>0 表示还有格步额度；coasting 表示额度刚耗尽但头部还没真正滑到落点，
      // 这段"最后一小截"也要用同样的速度动画着走完，而不是瞬间跳过去
      let remainingDist = (state.stepBudget > 0 || state.coasting) ? SNAKE_SPEED * dt : 0;
      // 本帧头部"实际"移动的像素距离（区别于上面的预算 remainingDist）：
      // 额度耗尽时可能会有一小段预算被直接丢弃而不产生真实位移（比如 coasting 提前到达
      // 落点时剩余预算被清零，见下方 remainingDist = 0 处），如果仍按预算折算生长量，
      // 生长速度会比头部实际前进速度快一点点，尾部端点就会瞬间多伸出一截、随后再被"追上"，
      // 视觉上表现为尾巴轻微反向生长/抖动。改成按真实位移折算生长即可让尾部与头部前进严格同步。
      let movedDist = 0;

      while (remainingDist > 0) {


       if (state.mode === 'STRAIGHT') {
         const dIn = DIRS[state.dir];
         const center = getCellCenter(state.targetGrid.col, state.targetGrid.row);
         // 正常情况下，目标点是"下一次判断转弯"的参照点(略微偏进新格子 R 像素)；
         // 但如果额度已经耗尽、正在往落点滑(coasting)，目标点要换成真正的落点，
         // 这样剩余的这一小段距离会用同一套"按帧推进+到点snap"的逻辑动画着走完，
         // 而不是像之前那样直接瞬间把坐标设成落点(那就是"闪跳"的根源)。
         const pStart = state.coasting && state.coastTarget
           ? state.coastTarget
           : { x: center.x - R * dIn.x, y: center.y - R * dIn.y };

         let dx = pStart.x - state.head.x;
         let dy = pStart.y - state.head.y;
         if (Math.abs(dx) > CANVAS_SIZE / 2) dx -= Math.sign(dx) * CANVAS_SIZE;
         if (Math.abs(dy) > CANVAS_SIZE / 2) dy -= Math.sign(dy) * CANVAS_SIZE;
         // 带符号的"沿行进方向"距离：正=还没到停靠点；负或0=已经到达/越过。
         // 之前用 Math.hypot 恒为正，一旦头部因为"停下时吸附到格子中心"而越过了
         // 这个参照点，会被误判成"还没到"，白白扣一次预算却不挪窝——这就是点击没反应的根源。
         const distToStart = dx * dIn.x + dy * dIn.y;

         if (distToStart <= 0 || remainingDist >= distToStart) {
           remainingDist -= Math.max(0, distToStart);
           movedDist += Math.max(0, distToStart);
           state.head.x = pStart.x;
           state.head.y = pStart.y;

           if (state.coasting) {
             // 已经真正滑到落点，彻底停下
             state.coasting = false;
             state.coastTarget = null;
             remainingDist = 0;
           } else {
             const targetDir = state.inputQueue.length > 0 ? state.inputQueue[0] : state.dir;
             const isTurn = (targetDir !== state.dir) && ((targetDir + 2) % 4 !== state.dir);

             if (isTurn) {
               state.inputQueue.shift();
               const dOut = DIRS[targetDir];
               const cross = dIn.x * dOut.y - dIn.y * dOut.x;
               const turnSign = cross > 0 ? 1 : -1;

               const cx = center.x - R * dIn.x + R * dOut.x;
               const cy = center.y - R * dIn.y + R * dOut.y;

               const startAngle = Math.atan2(-dOut.y, -dOut.x);
               let endAngle = startAngle + (turnSign * Math.PI / 2);

               state.mode = 'ARC';
               state.arc = {
                 cx, cy,
                 center,
                 currentAngle: startAngle,
                 endAngle,
                 turnSign,
                 targetDir
               };
             } else {
               state.targetGrid.col = (state.targetGrid.col + dIn.x + GRID_SIZE) % GRID_SIZE;
               state.targetGrid.row = (state.targetGrid.row + dIn.y + GRID_SIZE) % GRID_SIZE;
               state.stepBudget = Math.max(0, state.stepBudget - 1);
               if (state.stepBudget <= 0) {
                 // 额度耗尽：不再瞬间跳到落点，而是记下落点坐标，转入 coasting 状态，
                 // 剩余的这一小段(约CELL_SIZE-R那么长)会在后续的 while 循环/后续帧里
                 // 用同样的速度继续动画推进，直到真正到达落点才停下。
                 const newCenter = getCellCenter(state.targetGrid.col, state.targetGrid.row);
                 state.coasting = true;
                 state.coastTarget = {
                   x: newCenter.x + dIn.x * HEAD_LAND_OFFSET,
                   y: newCenter.y + dIn.y * HEAD_LAND_OFFSET
                 };
               }
             }
           }
         } else {
           state.head.x += dIn.x * remainingDist;
           state.head.y += dIn.y * remainingDist;
           movedDist += remainingDist;
           remainingDist = 0;
         }
       } else if (state.mode === 'ARC') {
  const { cx, cy, currentAngle, endAngle, turnSign, targetDir } = state.arc;
  const angularDist = remainingDist / R;
  const angleStep = angularDist * turnSign;
  let nextAngle = currentAngle + angleStep;

  let arcFinished = false;
  if (turnSign > 0 && nextAngle >= endAngle) arcFinished = true;
  if (turnSign < 0 && nextAngle <= endAngle) arcFinished = true;

  if (arcFinished) {
    const usedAngle = Math.abs(endAngle - currentAngle);
    remainingDist -= usedAngle * R;
    movedDist += usedAngle * R;

    state.head.x = cx + R * Math.cos(endAngle);
    state.head.y = cy + R * Math.sin(endAngle);

    state.dir = targetDir;
    state.mode = 'STRAIGHT';

    const dOut = DIRS[targetDir];
    state.targetGrid.col = (state.targetGrid.col + dOut.x + GRID_SIZE) % GRID_SIZE;
    state.targetGrid.row = (state.targetGrid.row + dOut.y + GRID_SIZE) % GRID_SIZE;
    state.stepBudget = Math.max(0, state.stepBudget - 1);
    if (state.stepBudget <= 0) {
      // 转弯刚好是这次的最后一步：同样不再瞬间跳到落点，
      // 而是转入 coasting，让 STRAIGHT 分支下一轮循环/后续帧继续动画滑过去
      const newCenter = getCellCenter(state.targetGrid.col, state.targetGrid.row);
      state.coasting = true;
      state.coastTarget = {
        x: newCenter.x + dOut.x * HEAD_LAND_OFFSET,
        y: newCenter.y + dOut.y * HEAD_LAND_OFFSET
      };
    }
  } else {
    state.arc.currentAngle = nextAngle;
    state.head.x = cx + R * Math.cos(nextAngle);
    state.head.y = cy + R * Math.sin(nextAngle);
    movedDist += remainingDist;
    remainingDist = 0;
  }
}
         else if (state.mode === 'ARC') {
          const { cx, cy, currentAngle, endAngle, turnSign, targetDir } = state.arc;
          const angularDist = remainingDist / R;
          const angleStep = angularDist * turnSign;
          let nextAngle = currentAngle + angleStep;

          let arcFinished = false;
          if (turnSign > 0 && nextAngle >= endAngle) arcFinished = true;
          if (turnSign < 0 && nextAngle <= endAngle) arcFinished = true;

          if (arcFinished) {
            const usedAngle = Math.abs(endAngle - currentAngle);
            remainingDist -= usedAngle * R;

            state.head.x = cx + R * Math.cos(endAngle);
            state.head.y = cy + R * Math.sin(endAngle);

            state.dir = targetDir;
            state.mode = 'STRAIGHT';

            const dOut = DIRS[targetDir];
            state.targetGrid.col = (state.targetGrid.col + dOut.x + GRID_SIZE) % GRID_SIZE;
            state.targetGrid.row = (state.targetGrid.row + dOut.y + GRID_SIZE) % GRID_SIZE;
            // 转弯圆弧走完，同样算走完了一格，扣减待走额度
            state.stepBudget = Math.max(0, state.stepBudget - 1);
            if (state.stepBudget <= 0) remainingDist = 0;
          } else {
            state.arc.currentAngle = nextAngle;
            state.head.x = cx + R * Math.cos(nextAngle);
            state.head.y = cy + R * Math.sin(nextAngle);
            remainingDist = 0;
          }
        }

        if (state.head.x < 0) state.head.x += CANVAS_SIZE;
        if (state.head.x >= CANVAS_SIZE) state.head.x -= CANVAS_SIZE;
        if (state.head.y < 0) state.head.y += CANVAS_SIZE;
        if (state.head.y >= CANVAS_SIZE) state.head.y -= CANVAS_SIZE;

        // 每完成一个运动子阶段（直线段终点/圆弧局部推进/圆弧终点）就记一次轨迹点。
        // 若只在循环外记一次，单帧内一次性"吞掉"整段圆弧时（弧长很短、dt较大时容易发生），
        // 轨迹就会用一条直线弦替代真实弧线，且这种情况随帧间dt波动时有时无，
        // 导致重采样出的身体节点在"贴合弧线"与"抄近路"之间跳变，即转弯处的抖动闪烁。
        state.trail.unshift({ x: state.head.x, y: state.head.y });
      }

      // 待增长队列：按本帧头部"实际"移动的距离折算成节点数，逐步消耗，让蛇尾随着前进慢慢变长
      // （而非瞬间拉长）。必须用循环结束后统计出的真实位移 movedDist，而不是循环开始前的
      // 预算 remainingDist，否则额度耗尽被丢弃的那一小截预算也会被算成"生长"，
      // 尾部就会比头部实际前进的距离多伸出一点点，产生轻微的反向生长和抖动。
      if (state.pendingGrowth > 0 && movedDist > 0) {
        const growthAvailable = movedDist / SEGMENT_SPACING;
        const applied = Math.min(state.pendingGrowth, growthAvailable);
        state.segmentFloat += applied;
        state.pendingGrowth -= applied;
        state.segmentCount = Math.floor(state.segmentFloat);
      }

      const bodyPositions = [];
      let currentDistance = 0;
      let targetDistance = SEGMENT_SPACING;
      let trailIndex = 0;

      while (
        bodyPositions.length < state.segmentCount - 1 &&
        trailIndex < state.trail.length - 1
      ) {
        const p1 = state.trail[trailIndex];
        const p2 = state.trail[trailIndex + 1];
        let dx = p2.x - p1.x;
        let dy = p2.y - p1.y;

        if (Math.abs(dx) > CANVAS_SIZE / 2) dx -= Math.sign(dx) * CANVAS_SIZE;
        if (Math.abs(dy) > CANVAS_SIZE / 2) dy -= Math.sign(dy) * CANVAS_SIZE;
        const dist = Math.hypot(dx, dy);

        if (currentDistance + dist >= targetDistance) {
          const ratio = (targetDistance - currentDistance) / dist;
          let px = (p1.x + dx * ratio + CANVAS_SIZE) % CANVAS_SIZE;
          let py = (p1.y + dy * ratio + CANVAS_SIZE) % CANVAS_SIZE;
          bodyPositions.push({ x: px, y: py });
          targetDistance += SEGMENT_SPACING;
        } else {
          currentDistance += dist;
          trailIndex++;
        }
      }
      // 注意：bodyPositions 用于自撞检测/格子包围判定，不能做补尾填充——
      // 若把缺的节点重复填成轨迹末端同一个点，该点离头部往往很近（如开局时几乎为0距离），
      // 会被自撞检测误判为"身体贴上了头部"，导致刚开局就判负。补尾只在纯视觉的
      // renderPositions 里做（见下方）。

      // 渲染专用的高密度采样点：与上面的逻辑完全一样，只是间距更细(RENDER_SPACING)，
      // 保证转弯圆弧上稳定采到足够的点，画出来的轮廓不会因采样相位漂移而逐帧变形。
      // 只影响描边视觉，不影响 bodyPositions（碰撞检测/格子占用判定仍用原来的间距）。
      const renderPositions = [];
      {
        let rDistance = 0;
        let rTarget = RENDER_SPACING;
        let rIndex = 0;
        const bodyLength = (state.segmentFloat - 1) * SEGMENT_SPACING;
        while (
          renderPositions.length < bodyLength / RENDER_SPACING &&
          rIndex < state.trail.length - 1
        ) {
          const p1 = state.trail[rIndex];
          const p2 = state.trail[rIndex + 1];
          let dx = p2.x - p1.x;
          let dy = p2.y - p1.y;

          if (Math.abs(dx) > CANVAS_SIZE / 2) dx -= Math.sign(dx) * CANVAS_SIZE;
          if (Math.abs(dy) > CANVAS_SIZE / 2) dy -= Math.sign(dy) * CANVAS_SIZE;
          const dist = Math.hypot(dx, dy);

          if (rDistance + dist >= rTarget) {
            const ratio = (rTarget - rDistance) / dist;
            let px = (p1.x + dx * ratio + CANVAS_SIZE) % CANVAS_SIZE;
            let py = (p1.y + dy * ratio + CANVAS_SIZE) % CANVAS_SIZE;
            renderPositions.push({ x: px, y: py });
            rTarget += RENDER_SPACING;
          } else {
            rDistance += dist;
            rIndex++;
          }
        }
        // 轨迹不够长时，只需再补一个锚点把路径收尾即可（视觉上尾部"冻结"在那一点，
        // 等真实轨迹追上来后再自然拉开）。之前误把这个锚点重复填充了很多次，
        // 导致大量坐标完全相同的零长度线段挤在一起，round线连接(lineJoin:'round')
        // 对这种重合点的处理不稳定，逐帧渲染出一个大小、位置都在跳动的团块——
        // 这正是"变长后尾部有团块跳动"的根源。只补一个点就不会有这个问题。
        const targetCount = Math.floor(bodyLength / RENDER_SPACING);
        if (renderPositions.length < targetCount && state.trail.length > 0) {
          const lastPoint = state.trail[state.trail.length - 1];
          renderPositions.push({ x: lastPoint.x, y: lastPoint.y });
        } else if (rIndex < state.trail.length - 1) {
          // 尾部精确定位：上面按 RENDER_SPACING(2px) 整数倍采样，导致尾部端点
          // 只能落在 2px 网格上；而 bodyLength 是连续变化的，端点会随之逐帧
          // "卡"在最近的网格点上跳变，这就是变长时残留的抖动。这里沿轨迹继续
          // 精确插值到恰好 bodyLength 处，用它替换掉最后一个近似点，
          // 让尾部端点随长度连续平滑移动，不再受 2px 网格限制。
          let rTarget2 = bodyLength;
          while (rIndex < state.trail.length - 1) {
            const p1 = state.trail[rIndex];
            const p2 = state.trail[rIndex + 1];
            let dx = p2.x - p1.x;
            let dy = p2.y - p1.y;
            if (Math.abs(dx) > CANVAS_SIZE / 2) dx -= Math.sign(dx) * CANVAS_SIZE;
            if (Math.abs(dy) > CANVAS_SIZE / 2) dy -= Math.sign(dy) * CANVAS_SIZE;
            const dist = Math.hypot(dx, dy);
            if (rDistance + dist >= rTarget2) {
              const ratio = (rTarget2 - rDistance) / dist;
              let px = (p1.x + dx * ratio + CANVAS_SIZE) % CANVAS_SIZE;
              let py = (p1.y + dy * ratio + CANVAS_SIZE) % CANVAS_SIZE;
              if (renderPositions.length > 0) {
                renderPositions[renderPositions.length - 1] = { x: px, y: py };
              } else {
                renderPositions.push({ x: px, y: py });
              }
              break;
            } else {
              rDistance += dist;
              rIndex++;
            }
          }
        }
      }

      const maxTrailLength = state.segmentCount * SEGMENT_SPACING * 3;
      if (state.trail.length > maxTrailLength) {
        state.trail.length = Math.floor(maxTrailLength);
      }

      if (!state.graceUntil || time > state.graceUntil) {
        for (let i = 8; i < bodyPositions.length; i++) {
          let dx = state.head.x - bodyPositions[i].x;
          let dy = state.head.y - bodyPositions[i].y;
          if (Math.abs(dx) > CANVAS_SIZE / 2) dx -= Math.sign(dx) * CANVAS_SIZE;
          if (Math.abs(dy) > CANVAS_SIZE / 2) dy -= Math.sign(dy) * CANVAS_SIZE;
          if (Math.hypot(dx, dy) < SNAKE_WIDTH * 0.7) {
            setGameOver(true);
            return;
          }
        }
      }

      // 包围判定：把身体所有节点（含头）映射到网格，检查是否覆盖了当前关卡所需的所有格子
      const headGrid = pixelToGrid(state.head.x, state.head.y);
      const occupiedSet = new Set();
      occupiedSet.add(`${headGrid.col}-${headGrid.row}`);
      for (let i = 0; i < bodyPositions.length; i++) {
        const g = pixelToGrid(bodyPositions[i].x, bodyPositions[i].y);
        occupiedSet.add(`${g.col}-${g.row}`);
      }
      const emojiKeySet = new Set(state.emojis.map(p => `${p.col}-${p.row}`));
      const requiredCells = getBoxCells(state.box.col, state.box.row, state.box.size)
        .map(p => `${p.col}-${p.row}`)
        .filter(id => !emojiKeySet.has(id));
      const fullyCovered = requiredCells.every(id => occupiedSet.has(id));
      const ateEmoji = emojiKeySet.has(`${headGrid.col}-${headGrid.row}`);

      if (fullyCovered) {
        // 成功填满 box（不含 emoji 格子）：加分、变长、升级、box+emoji 重新生成、闪烁提示
        const finishedLevel = state.level;
        applyScoreDeltaRef.current(scoreForLevel(finishedLevel));
        state.pendingGrowth += Math.ceil(rewardLength(finishedLevel) * CELLS_TO_SEGMENTS);
        // 最多到第9关：达到上限后继续通关只重新生成布局（换box位置+emoji排列），
        // 关卡数/难度（box大小、emoji数量、奖励、分值）都不再继续增长
        state.level = Math.min(state.level + 1, MAX_LEVEL);
        setLevel(state.level);
        spawnTarget(state.level);
        state.flashStart = time;

        // 存档：记录这一帧（包围成功、身体闪烁那一瞬间）的完整连续坐标状态，
        // 死亡或刷新重开后据此精确复原，而不是重新拼一个近似的姿态。
        saveSnakeOrbitProgress({
          level: state.level,
          head: { x: state.head.x, y: state.head.y },
          dir: state.dir,
          mode: state.mode,
          targetGrid: { ...state.targetGrid },
          arc: state.arc ? { ...state.arc } : null,
          trail: state.trail.map(p => ({ x: p.x, y: p.y })),
          segmentCount: state.segmentCount,
          segmentFloat: state.segmentFloat,
          pendingGrowth: state.pendingGrowth,
          box: { ...state.box },
          emojis: state.emojis.map(p => ({ ...p }))
        });
      } else if (ateEmoji) {
        // 直接撞上某个 emoji 格子 = "偷吃"：扣分，box+emoji 重新生成（关卡不变），闪烁提示
        applyScoreDeltaRef.current(-scoreForLevel(state.level));
        spawnTarget(state.level);
        state.flashStart = time;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      const rootStyle = getComputedStyle(document.documentElement);
      const bodyColor = rootStyle.getPropertyValue('--text-main').trim() || '#52c41a';
      const eyeColor = rootStyle.getPropertyValue('--home-bg').trim() || '#141414';
      const bgColorA = rootStyle.getPropertyValue('--line').trim() || '#262626';
      const bgColorB = rootStyle.getPropertyValue('--home-bg').trim() || '#141414';
      const [hiColorA, hiColorB] = boostContrast(bgColorA, bgColorB, 0.3);

      // 提示范围：本关的高对比度 box，本身就不跨越棋盘边界，直接用左上角+边长即可
      const hintColMin = state.box.col;
      const hintColMax = state.box.col + state.box.size - 1;
      const hintRowMin = state.box.row;
      const hintRowMax = state.box.row + state.box.size - 1;

      for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
          const inHintBox = col >= hintColMin && col <= hintColMax && row >= hintRowMin && row <= hintRowMax;
          const isEven = (row + col) % 2 === 0;
          ctx.fillStyle = inHintBox
            ? (isEven ? hiColorA : hiColorB)
            : (isEven ? bgColorA : bgColorB);
          ctx.fillRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
      }

      // 计算闪烁透明度：优先处理"重开/读档后的无敌保护期"，期间用同一套渐变节奏
      // 表现"无敌闪烁"提示；保护期结束后再走"吃到目标/包围成功"的常规闪烁逻辑
      let flashAlpha = 1;
      if (state.graceUntil && time < state.graceUntil) {
        const elapsed = GRACE_DURATION - (state.graceUntil - time);
        const keyframes = [0.2, 1, 0.2, 1, 1];
        const segLen = GRACE_DURATION / 4;
        const progress = elapsed / segLen;
        const segment = Math.min(3, Math.floor(progress));
        const t = progress - segment;
        flashAlpha = keyframes[segment] + (keyframes[segment + 1] - keyframes[segment]) * t;
      } else if (state.flashStart !== null) {
        const elapsed = time - state.flashStart;
        if (elapsed >= 600) {
          state.flashStart = null;
        } else {
          const keyframes = [0.2, 1, 0.2, 1, 1]; // 多加一个收尾值，方便插值到最后一段
          const progress = elapsed / 150; // 0~4 之间的小数
          const segment = Math.min(3, Math.floor(progress));
          const t = progress - segment; // 当前段内的小数进度 0~1
          flashAlpha = keyframes[segment] + (keyframes[segment + 1] - keyframes[segment]) * t;
        }
      }

      if (bodyPositions.length > 0) {
        ctx.lineWidth = SNAKE_WIDTH;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = bodyColor;
        ctx.globalAlpha = flashAlpha;

        ctx.beginPath();
        let prevPos = state.head;
        ctx.moveTo(prevPos.x, prevPos.y);

        for (let i = 0; i < renderPositions.length; i++) {
          const pos = renderPositions[i];
          const dx = Math.abs(pos.x - prevPos.x);
          const dy = Math.abs(pos.y - prevPos.y);

          if (dx > CELL_SIZE * 2 || dy > CELL_SIZE * 2) {
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
          } else {
            ctx.lineTo(pos.x, pos.y);
          }
          prevPos = pos;
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      const currentDirVec = DIRS[state.dir];
      const eyeAngle = Math.atan2(currentDirVec.y, currentDirVec.x);
      const eyeOffset = 0.5;
      const eyeDist = SNAKE_WIDTH * 0.3;
      ctx.fillStyle = eyeColor;
      ctx.beginPath();
      ctx.arc(
        state.head.x + Math.cos(eyeAngle - eyeOffset) * eyeDist,
        state.head.y + Math.sin(eyeAngle - eyeOffset) * eyeDist,
        2, 0, Math.PI * 2
      );
      ctx.arc(
        state.head.x + Math.cos(eyeAngle + eyeOffset) * eyeDist,
        state.head.y + Math.sin(eyeAngle + eyeOffset) * eyeDist,
        2, 0, Math.PI * 2
      );
      ctx.fill();

      // 主题色 box 内改成按关卡对应的动物 emoji：第1关🐭 ... 第7关🐳，超过7关沿用🐳，
      // 第 n 关共有 n 个同样的 emoji 共用同一块 box。放在蛇身/头部之后绘制：
      // 即使 emoji 格子和蛇身重叠（棋盘被占满时的兜底情况），emoji 也画在蛇身上层，不会被盖住看不见
      const targetEmoji = TARGET_EMOJIS[Math.min(state.level, TARGET_EMOJIS.length) - 1];
      ctx.font = `${CELL_SIZE}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const emojiPos of state.emojis) {
        const emojiCenter = getCellCenter(emojiPos.col, emojiPos.row);
        ctx.fillText(targetEmoji, emojiCenter.x, emojiCenter.y);
      }
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [gameOver, isReady]);

  return (
    <div
      onClick={() => gameOver && resetGame()}
      style={{
        position: isMobile ? 'fixed' : 'relative',
        left: isMobile ? 0 : undefined,
        top: isMobile ? 0 : undefined,
        fontFamily: 'monospace',
        color: 'var(--text-main)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: isMobile ? '100vw' : undefined,
        height: '100vh',
        boxSizing: 'border-box'
      }}
    >
      <style>{`
        .snake-orbit-panel {
          position: relative;
          height: 100dvh;
          width: 100dvh;
        }
        @media (max-width: 768px) {
          .snake-orbit-panel {
            width: 100dvw;
            height: 100dvw;
          }
        }
      `}</style>
      <div ref={panelRef} className="snake-orbit-panel">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          style={{ display: 'block', width: '100%', height: '100%', background: 'var(--home-bg)', touchAction: 'none' }}
        />
        {isMobile && (
          <div
            onPointerDown={(e) => {
              e.preventDefault();
              const rect = e.currentTarget.getBoundingClientRect();
              const cx = rect.left + rect.width / 2;
              const cy = rect.top + rect.height / 2;
              const dx = e.clientX - cx;
              const dy = e.clientY - cy;
              // 太靠近十字中心，忽略，避免误触
              if (Math.abs(dx) < DPAD_DEAD_ZONE && Math.abs(dy) < DPAD_DEAD_ZONE) return;
              // 和之前"全屏四象限"判断同一套思路：比较 |dx| 与 |dy|，谁大就沿哪个轴走，
              // 只是现在判断范围收窄到这个十字键区域内，且不依赖任何子元素的矩形命中——
              // 这样即使按键放大后彼此的矩形区域有重叠，也不会响应到"叠在上面"的错误方向。
              const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 0 : 2) : (dy > 0 ? 1 : 3);
              e.currentTarget.setPointerCapture(e.pointerId);
              dpadPointersRef.current.set(e.pointerId, dir);
              dpadRef.current.press(dir);
              setPressedDpad((prev) => new Set(prev).add(dir));
            }}
            onPointerUp={(e) => {
              const dir = dpadPointersRef.current.get(e.pointerId);
              if (dir === undefined) return;
              dpadPointersRef.current.delete(e.pointerId);
              dpadRef.current.release(dir);
              setPressedDpad((prev) => {
                // 可能还有另一根手指也按着同一个方向，那就先别去掉高亮
                const stillActive = Array.from(dpadPointersRef.current.values()).includes(dir);
                if (stillActive || !prev.has(dir)) return prev;
                const next = new Set(prev);
                next.delete(dir);
                return next;
              });
            }}
            onPointerCancel={(e) => {
              const dir = dpadPointersRef.current.get(e.pointerId);
              if (dir === undefined) return;
              dpadPointersRef.current.delete(e.pointerId);
              dpadRef.current.release(dir);
              setPressedDpad((prev) => {
                const stillActive = Array.from(dpadPointersRef.current.values()).includes(dir);
                if (stillActive || !prev.has(dir)) return prev;
                const next = new Set(prev);
                next.delete(dir);
                return next;
              });
            }}
            onContextMenu={(e) => e.preventDefault()}
            style={{
              // 用 fixed 直接锚定到屏幕视口，而不是 absolute 锚定到画布/面板容器——
              // 面板是居中的正方形，未必贴着屏幕底边，用 absolute+bottom:16 实际量出来的
              // 是"离面板底部16px"而不是"离屏幕底部16px"。改成 fixed 后这里的定位和
              // 画布的居中逻辑（面板仍然按原来的方式居中）完全独立，互不影响。
              position: 'fixed',
              right: 16,
              bottom: 16,
              width: DPAD_SIZE,
              height: DPAD_SIZE,
              zIndex: 5,
              touchAction: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            {DPAD_LAYOUT.map(({ dir, rotate, boxW, boxH, left, top }) => (
              <DPadKey
                key={dir}
                rotate={rotate}
                boxW={boxW}
                boxH={boxH}
                left={left}
                top={top}
                scale={DPAD_SCALE}
                pressed={pressedDpad.has(dir)}
              />
            ))}
          </div>
        )}
        {gameOver && (
          <div
            style={{
              position: 'fixed',
              top: '25%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'var(--home-bg)',
              color: 'var(--text-white)',
              fontWeight: 'bold',
              fontFamily: "monospace",
              lineHeight: "24px",
              textAlign: "center",
              width: "max-content",
              maxWidth: "calc(100vw - 40px)",
              boxSizing: "border-box",
              overflowWrap: "break-word",
              wordBreak: "normal",
              fontSize: '20px',
              padding: '10px 16px',
              zIndex: 10,
              whiteSpace: 'nowrap'
            }}
          >
            {t("game.Game over, click to restart")}
          </div>
        )}
      </div>
    </div>
  );
}