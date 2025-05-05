import type { QmsgType } from './qmsg'

async function getNameScreenShot(Qmsg: QmsgType) {
  try {
    // 发送截图请求
    const dataUrl = await chrome.runtime.sendMessage({ action: 'captureVisibleTab' });
    // 截图参数（可自定义）
    const rect = await getImageRect();
    if (rect.length === 0) return
    // 加载截图
    const img = await loadImage(dataUrl);
    // 裁剪图片
    const canvas = cropImage(img, rect[0], rect[1], rect[2], rect[3]);

    // 复制到剪贴板
    await copyCanvasToClipboard(canvas);
    Qmsg['success']('截图已复制到剪贴板!')
  } catch (error) {
    Qmsg['error'](`截图失败: ${error instanceof Error ? error.message : error}`)
  }
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('图片加载失败'));
  });
}

function cropImage(
  img: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const dpr = window.devicePixelRatio || 1; // 获取设备像素比

  // 设置 Canvas 实际分辨率（内存尺寸）
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  // 设置 Canvas 显示尺寸（CSS像素）
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法获取 Canvas 上下文');

  // 调整坐标系缩放
  ctx.scale(dpr, dpr);

  // 配置高质量图像平滑
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 绘制图像（注意参数顺序）
  ctx.drawImage(
    img,
    x, y,           // 源图像裁剪起点
    width, height,  // 源图像裁剪尺寸
    0, 0,           // 目标画布起点
    width, height   // 目标绘制尺寸（自动适配 DPR）
  );

  return canvas;
}

async function copyCanvasToClipboard(canvas: HTMLCanvasElement) {
  return new Promise<void>((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) return reject(new Error('图片转换失败'));

      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        resolve();
      } catch (error) {
        reject(new Error('剪贴板写入失败'));
      }
    }, 'image/png');
  });
}

async function getImageRect(): Promise<number[]> {
  const tr1 = document.querySelector('#entrustEditForm > table > tbody > tr:nth-child(6)')
  const tr2 = document.querySelector('#entrustEditForm > table > tbody > tr:nth-child(7)')
  const span1 = document.querySelector("#itemCName")
  if (!tr1) return []
  if (!tr2) return []
  if (!span1) return []
  let iframeRect: DOMRect = await getIframeRect()
  const tr1Rect = tr1.getBoundingClientRect()
  const tr2Rect = tr2.getBoundingClientRect()
  const span1Rect = span1.getBoundingClientRect()
  const dpr = window.devicePixelRatio
  return [
    tr1Rect.x + iframeRect.x,
    tr1Rect.y + iframeRect.y,
    span1Rect.x + span1Rect.width - tr1Rect.x,
    tr2Rect.y + tr2Rect.height - tr1Rect.y
  ].map((v) => {
    return dpr * v
  })
}

async function syncIframeRect() {
  const iframe = document.querySelector("#mainFrame")
  if (!iframe) return
  const rect = iframe.getBoundingClientRect()
  chrome.runtime.sendMessage({ 'action': 'syncIframeRect', rect })
}

async function getIframeRect(): Promise<DOMRect> {
  const rect: DOMRect = await chrome.runtime.sendMessage({ 'action': 'getIframeRect' })
  return rect;
}

function startSyncInterval() {
  setInterval(syncIframeRect, 1000)
}

function addShotListener(Qmsg: QmsgType) {
  let itemCName = document.querySelector("#entrustEditForm")
  console.log(itemCName, 'itemCName')
  if (!itemCName) return
  itemCName.addEventListener('dblclick', () => {getNameScreenShot(Qmsg)})
}

export { addShotListener, syncIframeRect, getIframeRect, startSyncInterval };