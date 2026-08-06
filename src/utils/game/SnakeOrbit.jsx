import { useEffect, useMemo, useRef, useState, useCallback } from "preact/hooks";
const GRID_SIZE = 21;
const CELL_SIZE = 30;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE; // 630px
const R = 4; // 弧线半径
const SNAKE_WIDTH = 24;
const SNAKE_SPEED = 120; // 像素/秒
const SNAKE_BOOST_MULTIPLIER = 2; // 按住与当前朝向相同的方向键时的加速倍数
const SEGMENT_SPACING = 8;
// 仅用于描边渲染的采样间距。必须明显小于转弯圆弧弧长(约 R*π/2 ≈ 6.28px)，
// 否则用 SEGMENT_SPACING(8px) 采样时，圆弧上"有没有采样点"会随头部移动的相位随机变化，
// 导致转弯处的轮廓在"有弧线"和"直线抄近路"之间逐帧跳变——这才是转弯抖动闪烁的根源。
const RENDER_SPACING = 2;
// 每个格子(30px)对应的身体节点数：CELL_SIZE / SEGMENT_SPACING，用于把"需要占满N个格子"换算成实际身体节点数
const CELLS_TO_SEGMENTS = CELL_SIZE / SEGMENT_SPACING;
// 圆头/圆尾(lineCap:'round')会让视觉总长比中心线路径多出SNAKE_WIDTH(两端各凸出半个线宽)，需扣除该误差
const INITIAL_SEGMENTS = Math.max(1, Math.round((8 * CELL_SIZE - SNAKE_WIDTH - CELL_SIZE) / SEGMENT_SPACING) + 1); // 开局视觉长度精确等于8格（在原公式基础上减去约1格的观测偏差）
const FOOD_RADIUS = 7;
// 主题色格子按关卡显示的动物：第1圈🐭 ... 第7圈🐳，超过7圈沿用🐳
const TARGET_EMOJIS = ['🐭', '🐔', '🐑', '🐄', '🐫', '🐘', '🐳'];

// 方向：0:右, 1:下, 2:左, 3:上
const DIRS = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: -1 }
];

const getCellCenter = (col, row) => ({
  x: (col + 0.5) * CELL_SIZE,
  y: (row + 0.5) * CELL_SIZE
});

// 像素坐标 -> 最近网格坐标（用于把连续运动的身体节点映射回格子做包围判定）
const pixelToGrid = (x, y) => ({
  col: (Math.floor(x / CELL_SIZE) + GRID_SIZE) % GRID_SIZE,
  row: (Math.floor(y / CELL_SIZE) + GRID_SIZE) % GRID_SIZE
});

// 第 n 关需要占满的格子总数：以目标格为中心，内到外共 n 圈（含）
const requiredCellCount = (n) => 4 * n * (n + 1);
// 完成第 n 关后蛇身增长多少格（格子数，非身体节点数，使用时需乘 CELLS_TO_SEGMENTS 换算）
const rewardLength = (n) => 8 * (n + 1);
// 每关得分/扣分：10、50、100、200、300...
const scoreForLevel = (n) => (n === 1 ? 10 : n === 2 ? 50 : 100 * (n - 2));

// 第 n 关目标格中心周围，切比雪夫距离 1~n 的所有格子坐标（不含中心本身），支持穿墙取模
function getRingCells(centerCol, centerRow, n) {
  const cells = [];
  for (let dr = -n; dr <= n; dr++) {
    for (let dc = -n; dc <= n; dc++) {
      if (dr === 0 && dc === 0) continue;
      const col = (centerCol + dc + GRID_SIZE) % GRID_SIZE;
      const row = (centerRow + dr + GRID_SIZE) % GRID_SIZE;
      cells.push(`${col}-${row}`);
    }
  }
  return cells;
}

// 生成第 n 关目标格位置：确保包围圈(n格边距)不会超出画布边界
function spawnTargetPosition(level) {
  const margin = level;
  const col = margin + Math.floor(Math.random() * (GRID_SIZE - margin * 2));
  const row = margin + Math.floor(Math.random() * (GRID_SIZE - margin * 2));
  return { col, row };
}

export default function SnakeOrbit() {
  const canvasRef = useRef(null);
  const panelRef = useRef(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const gameState = useRef({
    head: getCellCenter(10, 10),
    dir: 0,
    inputQueue: [],
    mode: 'STRAIGHT',
    targetGrid: { col: 11, row: 10 },
    arc: null,
    trail: [getCellCenter(10, 10)],
    segmentCount: INITIAL_SEGMENTS,
    segmentFloat: INITIAL_SEGMENTS,
    pendingGrowth: 0,
    level: 1,
    target: { col: 15, row: 10 },
    flashStart: null,
    lastTime: performance.now()
  });

  const spawnTarget = (level) => {
    let pos;
    do {
      pos = spawnTargetPosition(level);
    } while (pos.col === gameState.current.target.col && pos.row === gameState.current.target.row);
    gameState.current.target = pos;
  };

  const resetGame = () => {
    const startHead = getCellCenter(10, 10);
    gameState.current = {
      head: startHead,
      dir: 0,
      inputQueue: [],
      mode: 'STRAIGHT',
      targetGrid: { col: 11, row: 10 },
      arc: null,
      trail: [startHead],
      segmentCount: INITIAL_SEGMENTS,
      segmentFloat: INITIAL_SEGMENTS,
      pendingGrowth: 0,
      level: 1,
      target: { col: 15, row: 10 },
      flashStart: null,
      lastTime: performance.now()
    };
    spawnTarget(1);
    setScore(0);
    setLevel(1);
    setGameOver(false);
    setIsPaused(false);
  };

  useEffect(() => {
    spawnTarget(1);

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
      canvasEl.width = Math.round(rect.width * dpr);
      canvasEl.height = Math.round(rect.height * dpr);
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

    // 记录当前正被按住的方向键，用于判断是否与蛇头朝向一致从而加速
    const pressedDirs = new Set();

    const handleKeyDown = (e) => {
      let newDir = null;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') newDir = 0;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') newDir = 1;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') newDir = 2;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') newDir = 3;

      if (e.key === ' ') {
        e.preventDefault();
        setIsPaused(prev => !prev);
        return;
      }

      if (newDir !== null) {
        e.preventDefault();
        if (!e.repeat) {
          pressedDirs.add(newDir);
          queueDir(newDir);
        }
      }
    };

    const handleKeyUp = (e) => {
      let dirKey = null;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') dirKey = 0;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') dirKey = 1;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') dirKey = 2;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') dirKey = 3;
      if (dirKey !== null) {
        pressedDirs.delete(dirKey);
      }
    };

    // 移动端触摸控制：以整个游戏面板为参照，过中心点画一根45度线和一根与它垂直(135度)的线，
    // 把屏幕分成上下左右四个三角形区域，点哪个区域就朝哪个方向走（不显示分割线，让用户自己摸索）。
    // 判定方法等价于比较触摸点相对中心的 |dx| 与 |dy|：
    // |dx| > |dy| 落在左右两个区域，否则落在上下两个区域，边界正好是两条45度对角线。
    const handleTouchStart = (e) => {
      const panelEl = panelRef.current;
      if (!panelEl) return;
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      const rect = panelEl.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = touch.clientX - cx;
      const dy = touch.clientY - cy;

      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return; // 太靠近中心点，忽略避免误触

      let newDir;
      if (Math.abs(dx) > Math.abs(dy)) {
        newDir = dx > 0 ? 0 : 2; // 右 : 左
      } else {
        newDir = dy > 0 ? 1 : 3; // 下 : 上
      }
      queueDir(newDir);
    };

    const panelEl = panelRef.current;
    if (panelEl) {
      panelEl.addEventListener('touchstart', handleTouchStart, { passive: false });
    }

    const handleBlur = () => {
      pressedDirs.clear();
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    let animationFrameId;

    const gameLoop = (time) => {
      animationFrameId = requestAnimationFrame(gameLoop);
      if (gameOver || isPaused) return;

      const dt = Math.min((time - gameState.current.lastTime) / 1000, 0.1);
      gameState.current.lastTime = time;

      const state = gameState.current;
      const currentSpeed = pressedDirs.has(state.dir) ? SNAKE_SPEED * SNAKE_BOOST_MULTIPLIER : SNAKE_SPEED;
      let remainingDist = currentSpeed * dt;

      // 待增长队列：按本帧实际移动距离折算成节点数，逐步消耗，让蛇尾随着前进慢慢变长（而非瞬间拉长）
      if (state.pendingGrowth > 0) {
        const growthAvailable = remainingDist / SEGMENT_SPACING;
        const applied = Math.min(state.pendingGrowth, growthAvailable);
        state.segmentFloat += applied;
        state.pendingGrowth -= applied;
        state.segmentCount = Math.floor(state.segmentFloat);
      }

      while (remainingDist > 0) {


        if (state.mode === 'STRAIGHT') {
          const dIn = DIRS[state.dir];
          const center = getCellCenter(state.targetGrid.col, state.targetGrid.row);
          const pStart = {
            x: center.x - R * dIn.x,
            y: center.y - R * dIn.y
          };

          let dx = pStart.x - state.head.x;
          let dy = pStart.y - state.head.y;
          if (Math.abs(dx) > CANVAS_SIZE / 2) dx -= Math.sign(dx) * CANVAS_SIZE;
          if (Math.abs(dy) > CANVAS_SIZE / 2) dy -= Math.sign(dy) * CANVAS_SIZE;
          const distToStart = Math.hypot(dx, dy);

          if (remainingDist >= distToStart) {
            state.head.x = pStart.x;
            state.head.y = pStart.y;
            remainingDist -= distToStart;

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
            }
          } else {
            state.head.x += dIn.x * remainingDist;
            state.head.y += dIn.y * remainingDist;
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

            state.head.x = cx + R * Math.cos(endAngle);
            state.head.y = cy + R * Math.sin(endAngle);

            state.dir = targetDir;
            state.mode = 'STRAIGHT';

            const dOut = DIRS[targetDir];
            state.targetGrid.col = (state.targetGrid.col + dOut.x + GRID_SIZE) % GRID_SIZE;
            state.targetGrid.row = (state.targetGrid.row + dOut.y + GRID_SIZE) % GRID_SIZE;
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

      // 包围判定：把身体所有节点（含头）映射到网格，检查是否覆盖了当前关卡所需的所有格子
      const headGrid = pixelToGrid(state.head.x, state.head.y);
      const occupiedSet = new Set();
      occupiedSet.add(`${headGrid.col}-${headGrid.row}`);
      for (let i = 0; i < bodyPositions.length; i++) {
        const g = pixelToGrid(bodyPositions[i].x, bodyPositions[i].y);
        occupiedSet.add(`${g.col}-${g.row}`);
      }
      const requiredCells = getRingCells(state.target.col, state.target.row, state.level);
      const fullyCovered = requiredCells.every(id => occupiedSet.has(id));

      if (fullyCovered) {
        // 成功包围：加分、变长、升级、目标重新生成、闪烁提示
        const finishedLevel = state.level;
        setScore(s => s + scoreForLevel(finishedLevel));
        state.pendingGrowth += Math.ceil(rewardLength(finishedLevel) * CELLS_TO_SEGMENTS);
        state.level += 1;
        setLevel(state.level);
        spawnTarget(state.level);
        state.flashStart = time;
      } else if (headGrid.col === state.target.col && headGrid.row === state.target.row) {
        // 直接撞上目标格 = "偷吃"：扣分，目标重新生成（关卡不变），闪烁提示
        setScore(s => s - scoreForLevel(state.level));
        spawnTarget(state.level);
        state.flashStart = time;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      const rootStyle = getComputedStyle(document.documentElement);
      const lineColor = rootStyle.getPropertyValue('--line').trim() || '#262626';
      const bodyColor = rootStyle.getPropertyValue('--text-white-90').trim() || '#52c41a';
      const eyeColor = rootStyle.getPropertyValue('--home-bg').trim() || '#141414';

      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1;
      for (let i = 0; i <= GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, CANVAS_SIZE);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE);
        ctx.stroke();
      }

      // 主题色格子改成按关卡对应的动物emoji：第1圈🐭 ... 第7圈🐳，超过7圈沿用🐳
      const targetEmoji = TARGET_EMOJIS[Math.min(state.level, TARGET_EMOJIS.length) - 1];
      const targetCenter = getCellCenter(state.target.col, state.target.row);
      ctx.font = `${CELL_SIZE}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(targetEmoji, targetCenter.x, targetCenter.y);

      // 计算闪烁透明度：600ms内按 0→1→0→1→1 四段跳变，之后恢复常态不透明
      let flashAlpha = 1;
      if (state.flashStart !== null) {
        const elapsed = time - state.flashStart;
        if (elapsed >= 600) {
          state.flashStart = null;
        } else {
          const segment = Math.min(3, Math.floor(elapsed / 150));
          flashAlpha = [0, 1, 0, 1][segment];
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
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      if (panelEl) {
        panelEl.removeEventListener('touchstart', handleTouchStart);
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [gameOver, isPaused]);

  return (
    <div style={{ width: '100vw', height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--home-bg)', fontFamily: 'sans-serif', color: '#fff', boxSizing: 'border-box' }}>
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
        {gameOver && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <h2 style={{ color: '#ff4d4f', margin: '0 0 10px 0' }}>游戏结束</h2>
            <p style={{ margin: '0 0 20px 0' }}>最终得分: {score}</p>
            <button onClick={resetGame} style={{ padding: '8px 20px', fontSize: '16px', cursor: 'pointer', background: '#52c41a', color: '#fff', border: 'none', borderRadius: '4px' }}>
              重新开始
            </button>
          </div>
        )}
        {isPaused && !gameOver && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <h2 style={{ color: '#fff' }}>已暂停 (按空格键继续)</h2>
          </div>
        )}
      </div>
    </div>
  );
}