import { useState } from 'react';
import type { Nav } from '../App';
import type { MealKey } from '../types';
import { addDays, longDate, today } from '../dates';
import { useStore } from '../store';
import DaySummary from '../components/Fitness';
import Extras from '../components/Extras';
import { Historial } from '../components/Peso';
import { getCuerpo, edad } from '../fitness';
import { ultimaMedicion } from '../bascula';

const KEY = 'menu:yo';
const leerYo = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
/** Comida que corresponde a la hora actual, para anotar «Comí algo más». */
function comidaAhora(): MealKey {
  const h = new Date().getHours();
  return h < 10 ? 'desayuno' : h < 12 ? 'mediodia' : h < 15 ? 'comida' : h < 18 ? 'mediatarde' : 'cena';
}

/** «Mi perfil»: cada quien elige su nombre una vez y ve sus datos, peso, entrenos y balance del día. */
export default function Perfil({ date, setDate, go }: { date: string; setDate: (d: string) => void; go: (n: Nav) => void }) {
  const { s } = useStore();
  const people = s.people.filter((p) => p.active);
  const [yo, setYoState] = useState<string | null>(() => { const v = leerYo(); return v && people.some((p) => p.id === v) ? v : null; });
  const setYo = (id: string) => { setYoState(id); try { localStorage.setItem(KEY, id); } catch { /* ignore */ } };
  const p = people.find((x) => x.id === yo);
  const c = p ? getCuerpo(s.registro, p.id) : null;
  const m = p ? ultimaMedicion(s.registro, p.id, date) : null;

  return (
    <div className="page">
      <div className="sticky">
        <button className="back" onClick={() => go({ screen: 'home' })}>‹ Inicio</button>
        <div className="crumb"><b>Mi perfil</b><span>{p ? p.alias || p.name : '¿Quién eres?'}</span></div>
      </div>
      <p className="optlabel">{p ? 'Cambiar de persona' : 'Toca tu nombre (este teléfono lo recuerda)'}</p>
      <div className="people">
        {people.map((x) => (
          <button key={x.id} className={`person ${yo === x.id ? 'on' : ''}`} style={{ ['--pc' as string]: x.color }} onClick={() => setYo(x.id)}>{x.name}</button>
        ))}
      </div>
      {!people.length && <div className="empty">Todavía no hay integrantes cargados.</div>}

      {p && (
        <>
          <div className="perfil-head" style={{ ['--pc' as string]: p.color }}>
            <span className="avatar">{p.name.slice(0, 1)}</span>
            <div>
              <h2>{p.alias || p.name}</h2>
              <p className="small muted">
                {[c ? `${edad(c.nacimiento, today())} años` : null, c ? `${c.estatura_cm} cm` : null,
                  m ? `${m.peso_lb} lb (báscula ${m.date.slice(8)}/${m.date.slice(5, 7)})` : c ? `${c.peso_lb} lb` : null,
                  m?.grasa_pct != null ? `grasa ${m.grasa_pct} %` : null].filter(Boolean).join(' · ') || 'Llena «Mis datos» o sube tu báscula en «Mi peso».'}
              </p>
            </div>
          </div>

          <div className="datebox small-date">
            <button className="arrow" aria-label="Día anterior" onClick={() => setDate(addDays(date, -1))}>‹</button>
            <label className="datecenter"><span className="eyebrow">{date === today() ? 'Hoy' : 'Día'}</span><span className="bigdate">{longDate(date)}</span>
              <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Elegir fecha" /></label>
            <button className="arrow" aria-label="Día siguiente" onClick={() => setDate(addDays(date, 1))}>›</button>
          </div>

          <DaySummary person={p.id} date={date} />
          <Extras person={p.id} date={date} meal={comidaAhora()} />

          <h2 className="sec">Historial de peso</h2>
          <Historial person={p.id} />
        </>
      )}
    </div>
  );
}
