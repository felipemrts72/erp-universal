import { useRef } from 'react';

export function SignatureCanvas({ onChange }) {
  const ref = useRef(null);
  const drawing = useRef(false);

  const start = (e) => {
    drawing.current = true;
    draw(e);
  };
  const end = () => {
    drawing.current = false;
  };
  const draw = (e) => {
    if (!drawing.current) return;
    const canvas = ref.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    onChange(canvas.toDataURL('image/png'));
  };

  const clear = () => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange('');
  };

  return (
    <div>
      <canvas
        ref={ref}
        width={400}
        height={160}
        className="border rounded bg-white"
        onMouseDown={start}
        onMouseUp={end}
        onMouseMove={draw}
        onMouseLeave={end}
      />
      <button type="button" className="text-sm text-red-600 mt-1" onClick={clear}>Limpar assinatura</button>
    </div>
  );
}
