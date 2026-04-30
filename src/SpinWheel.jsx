import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

// Vibrant color palette for wheel segments
const COLORS = [
  ['#f7b731', '#e6a017'],
  ['#7b2ff7', '#5a18d4'],
  ['#ff4757', '#cc2030'],
  ['#2ed573', '#1aaa55'],
  ['#1e90ff', '#006dcc'],
  ['#ff6b35', '#cc4a10'],
  ['#a55bff', '#7a2ee0'],
  ['#ffa502', '#cc7a00'],
  ['#ff3f6c', '#cc1040'],
  ['#00d2d3', '#009b9c'],
  ['#ff9ff3', '#cc60c0'],
  ['#54a0ff', '#2060cc'],
];

function drawWheel(canvas, participants, rotationAngle) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 6;
  const n = participants.length;

  ctx.clearRect(0, 0, size, size);

  if (n === 0) {
    // Draw placeholder wheel
    ctx.save();
    const grad = ctx.createRadialGradient(cx, cy, 40, cx, cy, radius);
    grad.addColorStop(0, '#2a1860');
    grad.addColorStop(1, '#1a0f40');
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = `bold ${size * 0.07}px Nunito, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Ajoutez des', cx, cy - 16);
    ctx.fillText('participants !', cx, cy + 16);
    ctx.restore();
    return;
  }

  const arc = (Math.PI * 2) / n;

  for (let i = 0; i < n; i++) {
    const startAngle = rotationAngle + i * arc;
    const endAngle = startAngle + arc;
    const colorPair = COLORS[i % COLORS.length];

    // Segment fill with gradient
    const grad = ctx.createLinearGradient(
      cx + Math.cos(startAngle + arc / 2) * radius * 0.3,
      cy + Math.sin(startAngle + arc / 2) * radius * 0.3,
      cx + Math.cos(startAngle + arc / 2) * radius,
      cy + Math.sin(startAngle + arc / 2) * radius
    );
    grad.addColorStop(0, colorPair[0]);
    grad.addColorStop(1, colorPair[1]);

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.closePath();

    // Slightly dim excluded participants
    if (participants[i].excluded) {
      ctx.fillStyle = 'rgba(80,80,80,0.6)';
    } else {
      ctx.fillStyle = grad;
    }
    ctx.fill();

    // Separator lines
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Labels
    const textAngle = startAngle + arc / 2;
    const textRadius = radius * 0.65;
    const tx = cx + Math.cos(textAngle) * textRadius;
    const ty = cy + Math.sin(textAngle) * textRadius;

    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(textAngle + Math.PI / 2);

    const maxChars = n <= 4 ? 12 : n <= 6 ? 9 : 7;
    let label = participants[i].name;
    if (label.length > maxChars) label = label.slice(0, maxChars - 1) + '…';

    const fontSize = Math.max(10, Math.min(18, size * 0.042 - n * 0.5));
    ctx.font = `bold ${fontSize}px Nunito, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = participants[i].excluded ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.95)';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 4;
    ctx.fillText(label, 0, 0);

    ctx.restore();
  }

  // Outer ring
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Inner circle (center hub)
  const hubRadius = size * 0.1;
  const hubGrad = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, hubRadius);
  hubGrad.addColorStop(0, '#ffffff');
  hubGrad.addColorStop(0.5, '#f7b731');
  hubGrad.addColorStop(1, '#e6a017');
  ctx.beginPath();
  ctx.arc(cx, cy, hubRadius, 0, Math.PI * 2);
  ctx.fillStyle = hubGrad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

const SpinWheel = forwardRef(function SpinWheel({ participants, spinning, rotation }, ref) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const SIZE = 420;

  useEffect(() => {
    drawWheel(canvasRef.current, participants, rotation);
  }, [participants, rotation]);

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
  }));

  return (
    <canvas
      ref={canvasRef}
      className={`wheel-canvas${spinning ? ' spinning' : ''}`}
      width={SIZE}
      height={SIZE}
      style={{ maxWidth: '100%', height: 'auto' }}
      aria-label="Roue de tirage au sort"
    />
  );
});

export default SpinWheel;
export { drawWheel };
