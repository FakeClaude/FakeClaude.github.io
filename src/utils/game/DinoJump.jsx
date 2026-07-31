// src/utils/game/DinoJump.jsx
// 第一步：基础版恐龙跳跃（传统玩法，碰到仙人掌就死），先验证手感
// 素材改用内联 SVG（简笔恐龙 + 仙人掌），不依赖图片 import，后续你可以直接改这里的 SVG 字符串换皮肤
// 第二步会在这个基础上加"碰仙人掌触发隐藏山"的反转逻辑

import { useEffect, useRef, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";


// 后续换皮肤：直接改这几个 path 字符串（可以从别的 SVG 里复制 <path d="..."> 的内容）
function readThemeColor(varName, fallback) {
  const val = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  return val || fallback;
}

// 恐龙 1：左腿抬起（站立 / 跳跃 / 奔跑帧 A 都用这个），viewBox 0 0 15 17
const DINO_VB_W = 15;
const DINO_VB_H = 17;
const PATH_DINO_1 = new Path2D(
  "m14 0 1 1v3h-4v.5h2.5v1h-3V7h2v2h-1V8h-1v2.5L8 13v.5h1v1H7v-1H5L4 15v.5h1v1H3v-3L0 6h1l2 3 4-4V1l1-1zM8.5 2.5h1v-1h-1z"
);
// 恐龙 2：右腿抬起（仅用于奔跑帧 B）
const PATH_DINO_2 = new Path2D(
  "m14 0 1 1v3h-4v.5h2.5v1h-3V7h2v2h-1V8h-1v2.5L8 13v2.5h1v1H7V15l-1-1.5H4.5l-.5 1h1v1H3v-2L0 6h1l2 3 4-4V1l1-1zM8.5 2.5h1v-1h-1z"
);

// 仙人掌，viewBox 0 0 6 13
const CACTUS_VB_W = 6;
const CACTUS_VB_H = 13;
const PATH_CACTUS = new Path2D("M4 13H2V8H1L0 7V3h1v4h1V0h2v5h1V2h1v3L5 6H4z");

// 山
const MOUNTAIN_VB_W = 10;
const MOUNTAIN_VB_H = 6;
const PATH_MOUNTAIN = new Path2D("M2 6H0l1-6zm4 0H4l1-6zm4 0H8l1-6z");

// 通用绘制函数：把某个 Path2D（在它自己的 viewBox 坐标系里）等比缩放并平移到 canvas
function drawPath(ctx, path, x, y, w, h, vbW, vbH, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(w / vbW, h / vbH);
  ctx.fillStyle = color;
  ctx.fill(path);
  ctx.restore();
}

// 游戏参数
const GRAVITY = 0.6;
const JUMP_V = -12;
const DINO_W = 44;
const DINO_H = 47;
const MOUNTAIN_GAP = 130; // 山相对仙人掌的初始水平偏移
const MOUNTAIN_SCORE = 10; // 成功越过一座显形的山，加这么多分
const LEVEL_COMPLETE_BONUS = 10; // 闯关成功（累计翻过15座山）额外加这么多 token

// 真假仙人掌序列生成器：
function nextIsTrueCactus(s) {
  if (s.cactusGroupProgress < s.cactusGroupLength) {
    s.cactusGroupProgress += 1;
    return false; // 假仙人掌
  }
  // 当前组的假仙人掌已出完，这一个是真仙人掌，之后进入下一组（长度+1）
  s.cactusGroupProgress = 0;
  s.cactusGroupLength += 1;
  return true; // 真仙人掌
}

export default function DinoJump({ onScore, initialToken = 0, onTokenChange, onLevelComplete }) {
  const { t } = useTranslation();
  const canvasRef = useRef(null);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [levelComplete, setLevelComplete] = useState(false); // 累计翻过 1+2+3+4+5=15 座山后触发
  const [score, setScore] = useState(0);
  const [tokenLabel, setTokenLabel] = useState(0); // 翻过一座山(仙人掌不算) +1；死亡 -1；可以为负数
  // 画布尺寸改为跟随窗口大小的全屏尺寸，随 resize 更新
  const [dims, setDims] = useState({
    w: typeof window !== "undefined" ? window.innerWidth : 800,
    h: typeof window !== "undefined" ? window.innerHeight : 300,
  });

  useEffect(() => {
    function handleResize() {
      setDims({ w: window.innerWidth, h: window.innerHeight });
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const groundY = dims.h / 2;

  const stateRef = useRef({
    dinoY: groundY - DINO_H,
    dinoVY: 0,
    onGround: true,
    speed: 6,
    obstacles: [], // { x, w, h }
    frameCount: 0,
    spawnTimer: 0,
    scoreAcc: 0,
    tokenAcc: initialToken, // 翻山+1/死亡-1 的累计值，初始值来自外部传入（真实 token 余额）
    totalCrossed: 0, // 累计成功翻过的山数（跨重开不清零），达到 15（1+2+3+4+5）触发闯关
    levelCompleteTriggered: false,
    // 真假仙人掌序列生成器状态：
    // 假仙人掌连续出现次数按 1,2,3,4... 递增，每组假仙人掌后插入 1 个真仙人掌
    // 例：假(1个) 真 假(2个) 真 假(3个) 真 ...
    cactusGroupLength: 1,
    cactusGroupProgress: 0,
  });

  function handleAction() {
    if (levelComplete) {
      onLevelComplete?.();
      return;
    }
    if (gameOver) {
      restart();
      return;
    }
    if (!running) {
      setRunning(true);
    }
    const s = stateRef.current;
    if (s.onGround) {
      s.dinoVY = JUMP_V;
      s.onGround = false;
    }
  }

  useEffect(() => {
    function handleKey(e) {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        handleAction();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [running, gameOver]);

  function restart() {
    const prevTokenAcc = stateRef.current.tokenAcc; // token 余额跨局保留，不因重开而清零
    stateRef.current = {
      dinoY: groundY - DINO_H,
      dinoVY: 0,
      onGround: true,
      speed: 6,
      obstacles: [],
      frameCount: 0,
      spawnTimer: 0,
      scoreAcc: 0,
      tokenAcc: prevTokenAcc,
      totalCrossed: 0, // 死亡重开即清零，必须连续翻满 15 座才算闯关，不能接着上次的进度继续攒
      levelCompleteTriggered: false,
      cactusGroupLength: 1,
      cactusGroupProgress: 0,
    };
    setScore(0);
    setGameOver(false);
    setRunning(true);
  }

  useEffect(() => {
    if (!running) return;
    let rafId;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    // 按设备像素比提升 canvas 的实际渲染分辨率，避免在高清屏(Retina等)上模糊
    // canvas.width/height 是"实际像素"，CSS width/height 是"逻辑尺寸"，二者不一致时浏览器会自动拉伸缩放导致糊
    const dpr = window.devicePixelRatio || 1;
    const CANVAS_W = dims.w;
    const CANVAS_H = dims.h;
    const GROUND_Y = groundY;
    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
    canvas.style.width = CANVAS_W + "px";
    canvas.style.height = CANVAS_H + "px";
    ctx.scale(dpr, dpr); // 之后所有绘制坐标仍按 CANVAS_W/CANVAS_H 的逻辑尺寸来写，无需改动业务代码

    function loop() {
      const s = stateRef.current;

      // 物理更新
      if (!s.onGround) {
        s.dinoVY += GRAVITY;
        s.dinoY += s.dinoVY;
        if (s.dinoY >= GROUND_Y - DINO_H) {
          s.dinoY = GROUND_Y - DINO_H;
          s.dinoVY = 0;
          s.onGround = true;
        }
      }

      // 生成障碍物（仙人掌 + 它右后方跟着一座隐藏的山，成对出现）
      s.spawnTimer -= 1;
      if (s.spawnTimer <= 0) {
        const cactusScale = 0.85 + Math.random() * 0.1; // 缩小波动范围（原 0.6~1.2 -> 0.85~1.15）
        const cactusW = 24 * cactusScale;
        const cactusH = 60 * cactusScale;
        const mountainW = 45 + Math.random() * 20;
        const mountainH = 30; // 固定高度，不再随机（确保跳跃弧顶能稳定覆盖）
        const isTrue = nextIsTrueCactus(s); // 按序列规律判断这个仙人掌是真是假
        s.obstacles.push({
          isTrue, // 真仙人掌：碰到直接死亡，没有隐藏山；假仙人掌：碰到没事，后面藏着山
          cactusX: CANVAS_W,
          cactusW,
          cactusH,
          mountainX: CANVAS_W + MOUNTAIN_GAP,
          mountainW,
          mountainH,
          revealed: false, // 山是否已显形（碰到仙人掌后触发，仅假仙人掌会用到）
          cleared: false, // 是否已成功越过显形的山（计分用，仅假仙人掌会用到）
        });
        s.spawnTimer = 70 + Math.floor(Math.random() * 60);
      }

      // 移动障碍物 + 反转碰撞判定
      const dinoLeft = CANVAS_W * 0.05;
      const dinoRight = dinoLeft + DINO_W;
      const dinoTop = s.dinoY;
      const dinoBottom = s.dinoY + DINO_H;
      const REVEAL_DISTANCE = 20; // 走到山前方这段距离时，山才显示出来

      let hit = false;
      let newlyScored = 0;
      let crossedCount = 0; // 本帧成功翻过的山的数量（仙人掌不算），用于 tokenLabel +1

      for (const ob of s.obstacles) {
        ob.cactusX -= s.speed;
        ob.mountainX -= s.speed;

        // 仙人掌碰撞检测
        const cactusLeft = ob.cactusX;
        const cactusRight = ob.cactusX + ob.cactusW;
        const cactusTop = GROUND_Y - ob.cactusH;
        const cactusBottom = GROUND_Y;
        const touchCactus =
          dinoRight > cactusLeft &&
          dinoLeft < cactusRight &&
          dinoBottom > cactusTop &&
          dinoTop < cactusBottom;

        if (ob.isTrue) {
          // 真仙人掌：没有隐藏山，碰到就直接死
          if (touchCactus) {
            hit = true;
          }
        } else {
          // 假仙人掌：碰到本身没事（touchCactus 不触发任何效果），
          // 后面藏着一座山，走到山前方 REVEAL_DISTANCE 处才显形

          // 山的显形：不管有没有碰到仙人掌，走到山前方 REVEAL_DISTANCE 处就显示
          if (!ob.revealed && ob.mountainX - dinoRight <= REVEAL_DISTANCE) {
            ob.revealed = true;
          }

          // 山碰撞检测：只有显形后才参与判定
          if (ob.revealed) {
            const mountainLeft = ob.mountainX;
            const mountainRight = ob.mountainX + ob.mountainW;
            const mountainTop = GROUND_Y - ob.mountainH;
            const mountainBottom = GROUND_Y;
            const touchMountain =
              dinoRight > mountainLeft &&
              dinoLeft < mountainRight &&
              dinoBottom > mountainTop &&
              dinoTop < mountainBottom;

            if (touchMountain) {
              hit = true;
            }

            // 山已完全越过身后，且之前没结算过 -> 加分 + token +1
            if (!ob.cleared && mountainRight < dinoLeft) {
              ob.cleared = true;
              if (!touchMountain) {
                newlyScored += MOUNTAIN_SCORE;
                crossedCount += 1;
              }
            }
          }
        }
      }
      s.obstacles = s.obstacles.filter((ob) => ob.mountainX + ob.mountainW > -10);


      // 计分只来自"越过显形的山"（newlyScored），不再有存活时间加分
      if (newlyScored > 0) {
        s.scoreAcc += newlyScored;
        setScore(s.scoreAcc);
      }
      if (crossedCount > 0) {
        s.tokenAcc += crossedCount;
        setTokenLabel(s.tokenAcc);
        onTokenChange?.(s.tokenAcc, crossedCount); // 第二个参数是本次变化量，正数表示加分

        s.totalCrossed += crossedCount;
        if (!s.levelCompleteTriggered && s.totalCrossed >= 15) {
          s.levelCompleteTriggered = true;
          // 闯关成功额外 +10 token
          s.tokenAcc += LEVEL_COMPLETE_BONUS;
          setTokenLabel(s.tokenAcc);
          onTokenChange?.(s.tokenAcc, LEVEL_COMPLETE_BONUS);
          setLevelComplete(true);
          setRunning(false); // 暂停游戏，等待用户点击进入下一关
        }
      }
      s.frameCount++;
      if (s.frameCount % 300 === 0 && s.speed < 14) {
        s.speed += 0.5;
      }

      // ------- 渲染 -------
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      ctx.strokeStyle = readThemeColor("--line", "rgba(0,0,0,0.2)");
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(CANVAS_W, GROUND_Y);
      ctx.stroke();

      // 恐龙
      const dinoColor = readThemeColor("--text-main", "#535353");
      const dinoPath = s.onGround
        ? (s.frameCount % 12 < 6 ? PATH_DINO_1 : PATH_DINO_2)
        : PATH_DINO_1; // 跳跃/站立统一用"左腿抬起"这一帧
      drawPath(ctx, dinoPath, CANVAS_W * 0.05, s.dinoY, DINO_W, DINO_H, DINO_VB_W, DINO_VB_H, dinoColor);

      // 障碍物：仙人掌一直画出来；山只有 revealed 之后才画出来
      const cactusColor = readThemeColor("--accent", "#D97757");
      const mountainColor = readThemeColor("--accent-hover", "#C6613F");
      for (const ob of s.obstacles) {
        drawPath(
          ctx,
          PATH_CACTUS,
          ob.cactusX,
          GROUND_Y - ob.cactusH,
          ob.cactusW,
          ob.cactusH,
          CACTUS_VB_W,
          CACTUS_VB_H,
          cactusColor
        );
        if (ob.revealed) {
          drawPath(
            ctx,
            PATH_MOUNTAIN,
            ob.mountainX,
            GROUND_Y - ob.mountainH,
            ob.mountainW,
            ob.mountainH,
            MOUNTAIN_VB_W,
            MOUNTAIN_VB_H,
            mountainColor
          );
        }
      }

      // 分数 / 状态文字：画在画布正中间，带背景色块防止和地面/障碍物重叠看不清
      const statusText = ``;
      ctx.font = "bold 20px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const textMetrics = ctx.measureText(statusText);
      const paddingX = 16;
      const paddingY = 10;
      const boxW = textMetrics.width + paddingX * 2;
      const boxH = 20 + paddingY * 2;
      const centerX = CANVAS_W / 2;
      const centerY = CANVAS_H / 4;
      ctx.fillStyle = readThemeColor("--home-bg", "rgba(255,255,255,0.85)");
      ctx.fillRect(centerX - boxW / 2, centerY - boxH / 2, boxW, boxH);
      ctx.fillStyle = readThemeColor("--text-main", "#535353");
      ctx.fillText(statusText, centerX, centerY);
      ctx.textAlign = "start";
      ctx.textBaseline = "alphabetic";

          if (hit) {
        s.tokenAcc -= 1; // 死亡 -1，可以为负数
        setTokenLabel(s.tokenAcc);
        onTokenChange?.(s.tokenAcc, -1); // 第二个参数是本次变化量，负数表示扣分
        setGameOver(true);
        setRunning(false);
        setScore(s.scoreAcc);
        return; // 渲染完最后一帧后再停止循环
      }

      if (s.levelCompleteTriggered && running) {
        // 闯关刚触发：渲染完这一帧后停止循环，等待用户点击进入下一关
        return;
      }

      rafId = requestAnimationFrame(loop);
    }

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [running, dims]);

  // running 为 false 时（未开始 / 游戏结束），主循环 effect 不会绘制，这里补一帧静态画面
  useEffect(() => {
    if (running) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const CANVAS_W = dims.w;
    const CANVAS_H = dims.h;

    if (!gameOver && !levelComplete) {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = CANVAS_W * dpr;
      canvas.height = CANVAS_H * dpr;
      canvas.style.width = CANVAS_W + "px";
      canvas.style.height = CANVAS_H + "px";
      ctx.scale(dpr, dpr);

      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // 地面线
      ctx.strokeStyle = readThemeColor("--line", "rgba(0,0,0,0.2)");
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(CANVAS_W, groundY);
      ctx.stroke();

      // 恐龙（静止姿态）
      const dinoColor = readThemeColor("--text-main", "#535353");
      drawPath(
        ctx,
        PATH_DINO_1,
        CANVAS_W * 0.05,
        groundY - DINO_H,
        DINO_W,
        DINO_H,
        DINO_VB_W,
        DINO_VB_H,
        dinoColor
      );
    }

    // 居中文字
    const statusText = levelComplete
      ? t("game.Level complete, click to enter next level")
      : gameOver
      ? t("game.Game over, click to restart")
      : t("game.Click to start");
    ctx.font = "bold 20px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const textMetrics = ctx.measureText(statusText);
    const paddingX = 16;
    const paddingY = 10;
    const boxW = textMetrics.width + paddingX * 2;
    const boxH = 20 + paddingY * 2;
    const centerX = CANVAS_W / 2;
    const centerY = CANVAS_H / 4;
    ctx.fillStyle = readThemeColor("--home-bg", "rgba(255,255,255,0.85)");
    ctx.fillRect(centerX - boxW / 2, centerY - boxH / 2, boxW, boxH);
    ctx.fillStyle = readThemeColor("--text-white", "#535353");
    ctx.fillText(statusText, centerX, centerY);
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }, [running, gameOver, levelComplete, score, dims, groundY]);

  return (
    <div
      onClick={handleAction}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        fontFamily: "monospace",
        color: "var(--text-white)",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        width={dims.w}
        height={dims.h}
        style={{
          display: "block",
          background: "var(--home-bg)",
        }}
      />
    </div>
  );
}