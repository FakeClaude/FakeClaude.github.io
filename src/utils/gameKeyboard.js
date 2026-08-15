// 通用的"上下左右 + 长按连续走"输入逻辑，供各个 game 组件共用。
// 方向编号约定：0右 1下 2左 3上（与各 game 内部方向定义保持一致）。
//
// 用法：
//   const dpadRef = useRef({ press: () => {}, release: () => {} });
//   useDirectionInput({
//     enabled: isReady,          // 是否启用监听（如存档未读取完成时可传 false）
//     gameOver,                  // 游戏结束时任意方向键/按键触发 onGameOver
//     onGameOver: resetGame,
//     onQueueDir: queueDir,      // 按下方向时调用，把方向塞进游戏自己的输入队列
//     onStepBudget: (delta) => { state.stepBudget += delta },  // 攒行走额度
//     holdThresholdMs: 250,      // 按住超过多久判定为"长按连续走"
//     dpadRef                    // 供虚拟方向键按钮通过 ref 调用 press/release
//   }, [gameOver, isReady]);
//
// 返回：{ getHeldDir(time) } —— 在 gameLoop 里每帧调用，取得当前应该持续供给
// 移动额度的方向（长按判定通过后），没有则返回 null。

import { useEffect, useRef } from "preact/hooks";

const DEFAULT_HOLD_THRESHOLD_MS = 250;

// ------- 虚拟方向键(D-pad) UI：纯视觉展示，供各 game 组件共用 -------
// 方向编号：0右 1下 2左 3上，与 useDirectionInput 的方向约定一致。

// D-pad 十字布局：按键放大2倍(scale=2)、相邻间距改成-16px(负数，让透明的键帽留白区域
// 互相叠一点，视觉上更紧凑——SVG本身四周有不少空白，负间距不会让"看得见的图形"真的挤在一起)。
// 容器整体尺寸随 scale/GAP 推算：SIZE = 2*KEY_H + KEY_W + 2*GAP，横竖都是同一个值(正方形)。
export const DPAD_SCALE = 2;
export const DPAD_GAP = -10;
export const DPAD_KEY_W = 20 * DPAD_SCALE; // 上/下键盘竖放的宽度
export const DPAD_KEY_H = 30 * DPAD_SCALE; // 上/下键盘竖放的高度；左右键旋转90°后宽高互换
export const DPAD_SIZE = DPAD_KEY_H * 2 + DPAD_KEY_W + DPAD_GAP * 2;
export const DPAD_LAYOUT = [
  { dir: 3, rotate: 0, boxW: DPAD_KEY_W, boxH: DPAD_KEY_H, left: (DPAD_SIZE - DPAD_KEY_W) / 2, top: 0 }, // 上
  { dir: 0, rotate: 90, boxW: DPAD_KEY_H, boxH: DPAD_KEY_W, left: DPAD_SIZE - DPAD_KEY_H, top: (DPAD_SIZE - DPAD_KEY_W) / 2 }, // 右
  { dir: 1, rotate: 180, boxW: DPAD_KEY_W, boxH: DPAD_KEY_H, left: (DPAD_SIZE - DPAD_KEY_W) / 2, top: DPAD_SIZE - DPAD_KEY_H }, // 下
  { dir: 2, rotate: 270, boxW: DPAD_KEY_H, boxH: DPAD_KEY_W, left: 0, top: (DPAD_SIZE - DPAD_KEY_W) / 2 } // 左
];
// 触摸/点击判定的"死区"半径：太靠近十字中心时忽略，避免在正中间误触
export const DPAD_DEAD_ZONE = 4;

// 虚拟方向键单个按键：纯视觉展示，不再自己接收点击（点击判定统一交给外层容器处理）。
// 内层是固定 20x30 的"键帽+箭头"整体，通过 CSS rotate 转成四个方向，
// 不用分别画四份 SVG。按下时整体右下偏移1px(0.2s动画)+对比度提升，
// 键帽自带右下角1px投影(用 drop-shadow 贴合形状轮廓，而不是矩形 box-shadow)。
export function DPadKey({ rotate, boxW, boxH, left, top, pressed, scale }) {
  const w = 20 * scale;
  const h = 30 * scale;
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width: boxW,
        height: boxH,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // 纯视觉层，不拦截指针事件——点击判定统一交给外层容器处理，
        // 避免放大后按键区域互相重叠时，命中的是"叠在上面"的按键而不是视觉上该响应的那个。
        pointerEvents: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none', // 去掉 iOS 长按弹出的放大镜/复制菜单
        WebkitTapHighlightColor: 'transparent',
        transition: 'transform 0.1s ease, filter 0.1s ease',
        transform: pressed ? 'translate(1px, 1px)' : 'translate(0, 0)',
        filter: pressed ? 'contrast(1.4)' : 'none'
      }}
    >
      <div style={{ position: 'relative', width: w, height: h, transform: `rotate(${rotate}deg)` }}>
        <svg
          width={w} height={h} viewBox="0 0 20 30" fill="none"
          style={{ display: 'block', filter: 'drop-shadow(1px 1px 0 var(--text-placeholder))' }}
        >
          <path fill="var(--text-white-20)" d="M0 19.2V2Q.2.2 2 0h16a2 2 0 0 1 2 2v17.2q0 .8-.6 1.4l-8 8a2 2 0 0 1-2.8 0l-8-8a2 2 0 0 1-.6-1.4" />
        </svg>
        <svg
          width={7 * scale} height={5 * scale} viewBox="0 0 7 5" fill="none"
          style={{ position: 'absolute', left: '50%', top: '35%', transform: 'translate(-50%, -50%)' }}
        >
          <path fill="var(--text-placeholder)" d="M3 .2.2 3.9q-.3.6.4.8h6q.6-.2.3-.8L3.8.2a1 1 0 0 0-.7 0" />
        </svg>
      </div>
    </div>
  );
}

export function useDirectionInput(
  { enabled = true, gameOver, onGameOver, onQueueDir, onStepBudget, holdThresholdMs = DEFAULT_HOLD_THRESHOLD_MS, dpadRef },
  deps = []
) {
  // 暴露给 gameLoop 用的"当前长按生效方向"查询函数，通过 ref 传出去，
  // 避免每帧都要重新拿闭包（effect 依赖变化时才重建一次）
  const heldDirGetterRef = useRef(() => null);

  useEffect(() => {
    if (!enabled) return undefined;

    // 记录当前正被按住的方向键：数组当栈使用，最后按下的键始终在栈顶、优先生效
    // （即便更早按住的键还没松开）；松开当前生效的键后，退回到次新的、仍按住的键继续走。
    const pressedDirs = [];
    // 记录每个方向键"按下的时刻"，用于判断到底是"点一下"还是"有意按住"
    const pressStartTimes = new Map();

    const pressDir = (newDir) => {
      if (gameOver) {
        onGameOver?.();
        return;
      }
      // 这个方向本来就已经按住了（比如系统重复触发），忽略
      if (pressedDirs.includes(newDir)) return;
      pressedDirs.push(newDir);
      pressStartTimes.set(newDir, performance.now());
      onQueueDir?.(newDir);
      // 点一下(或按住起步)先攒1格的行走额度
      onStepBudget?.(1);
    };

    const releaseDir = (dirKey) => {
      const idx = pressedDirs.indexOf(dirKey);
      if (idx === -1) return;
      const wasActive = idx === pressedDirs.length - 1; // 松开的是不是当前正生效(栈顶)的方向
      pressedDirs.splice(idx, 1);
      pressStartTimes.delete(dirKey);
      // 松开的正是当前生效的方向，且还有别的方向仍按住：切回那个方向继续走
      if (wasActive && pressedDirs.length > 0) {
        const resumeDir = pressedDirs[pressedDirs.length - 1];
        onQueueDir?.(resumeDir);
      }
    };

    // 把这两个函数暴露给组件下方渲染的虚拟方向键按钮
    if (dpadRef) {
      dpadRef.current.press = pressDir;
      dpadRef.current.release = releaseDir;
    }

    const handleKeyDown = (e) => {
      if (gameOver) {
        e.preventDefault();
        if (!e.repeat) onGameOver?.();
        return;
      }

      let newDir = null;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') newDir = 0;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') newDir = 1;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') newDir = 2;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') newDir = 3;

      if (newDir !== null) {
        e.preventDefault();
        // 忽略系统自动重复触发的 keydown
        if (!e.repeat) pressDir(newDir);
      }
    };

    const handleKeyUp = (e) => {
      let dirKey = null;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') dirKey = 0;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') dirKey = 1;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') dirKey = 2;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') dirKey = 3;
      if (dirKey !== null) releaseDir(dirKey);
    };

    const handleBlur = () => {
      pressedDirs.length = 0;
      pressStartTimes.clear();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    // 供 gameLoop 每帧查询：是否有方向键已按住超过阈值时长，需要持续供给移动额度
    heldDirGetterRef.current = (time) => {
      if (pressedDirs.length === 0) return null;
      const heldDir = pressedDirs[pressedDirs.length - 1]; // 栈顶：最后按下（或最后恢复生效）的方向键
      const pressedAt = pressStartTimes.get(heldDir) ?? time;
      if (time - pressedAt >= holdThresholdMs) return heldDir;
      return null;
    };

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      heldDirGetterRef.current = () => null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return {
    getHeldDir: (time) => heldDirGetterRef.current(time)
  };
}