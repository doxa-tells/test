// web/catalog/components/MyCastingsClient.tsx
"use client";
import * as React from "react";
import { api, bp } from "../lib/http";

export type CastingItem = { id: number; title: string; description: string | null };

export default function MyCastingsClient({ items }: { items: CastingItem[] }) {
  const [open, setOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<number | null>(null);
  const [step, setStep] = React.useState(0);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [castData, setCastData] = React.useState<any | null>(null);
  const [loadingEdit, setLoadingEdit] = React.useState(false);
  const [filesState, setFilesState] = React.useState<File[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [existingFiles, setExistingFiles] = React.useState<Array<{id:number; filename:string; url:string}>>([]);

  async function onDelete(id: number) {
    if (!confirm("Удалить кастинг? Это действие нельзя отменить.")) return;
    setDeleting(id);
    try {
      const r = await fetch(api(`/api/castings/${id}`), { method: "DELETE" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) throw new Error(d.error || "delete_failed");
      location.reload();
    } catch (e) {
      console.error(e);
      alert("Не удалось удалить кастинг");
    } finally {
      setDeleting(null);
    }
  }

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const steps = [
    { key: 'base', label: 'База' },
    { key: 'look', label: 'Внешние' },
    { key: 'params', label: 'Параметры' },
    { key: 'extra', label: 'Дополнительно' },
    { key: 'files', label: 'Файлы' },
  ];

  function nextStep() {
    if (step < steps.length - 1) setStep(step + 1);
  }
  function prevStep() {
    if (step > 0) setStep(step - 1);
  }

  return (
    <div>
      {items && items.length > 0 && (
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {items.map((c) => (
            <div key={c.id} className="castBtn">
              <a href={bp(`/feed/${c.id}`)} style={{ flex: 1, minWidth: 0 }}>
                <div className="castTitle">{c.title}</div>
                <div className="castDesc">{c.description || "без описания"}</div>
              </a>
              <div className="castActions">
                <button className="iconBtn" onClick={async () => {
                  setStep(0);
                  setEditingId(c.id);
                  setCastData(null);
                  setOpen(true);
                  setLoadingEdit(true);
                  try{
                    const r1 = await fetch(api(`/api/castings/${c.id}`));
                    const d1 = await r1.json();
                    const r2 = await fetch(api(`/api/castings/${c.id}/prefs`));
                    const d2 = await r2.json();
                    const r3 = await fetch(api(`/api/castings/${c.id}/files`));
                    const d3 = await r3.json();
                    const item = d1?.item || {};
                    const prefs = d2?.prefs || {};
                    setCastData({ ...prefs, ...item });
                    setExistingFiles((d3?.items || []).map((f:any)=>({ id:f.id, filename:f.filename, url:f.url })));
                  }catch(e){
                    console.error(e);
                  }finally{
                    setLoadingEdit(false);
                  }
                }} title="Редактировать" aria-label="Редактировать">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4h9a2 2 0 0 1 2 2v9"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L10 17l-4 1 1-4 11.5-11.5z"/></svg>
                </button>
                <button className="iconBtn" onClick={() => onDelete(c.id)} disabled={deleting === c.id} title="Удалить" aria-label="Удалить">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="plusFull" onClick={() => { setStep(0); setEditingId(null); setCastData(null); setFilesState([]); setExistingFiles([]); setOpen(true); }}>+ Создать кастинг</button>

      {open && (
        <div className="overlay" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div className="row space" style={{alignItems:'center'}}>
                <div className="h2">{editingId ? 'Редактировать кастинг' : 'Создать новый кастинг'}</div>
                <button className="iconBtn" onClick={() => setOpen(false)} aria-label="Закрыть">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div className="stepper">
                {steps.map((s, i) => (
                  <button key={s.key} type="button" className={`step ${i === step ? 'step--active' : i < step ? 'step--done' : ''}`} onClick={() => setStep(i)}>
                    <span className="stepNum">{i+1}</span>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {editingId && loadingEdit ? (
              <div className="modalBody">
                <div className="p">Загрузка данных кастинга…</div>
              </div>
            ) : (
            <form key={`${editingId ?? 'new'}:${castData ? 'loaded' : 'empty'}`} action={bp(editingId ? `/api/castings/${editingId}` : '/api/castings')} method="post" encType="multipart/form-data" className="grid1" onSubmit={()=>{ setSubmitting(true); }}>
              {editingId && (
                <input type="hidden" name="_method" value="PUT" />
              )}
              <div className="modalBody">
                {/* Step 1: Base */}
                <div className="section" style={{ display: step === 0 ? 'block' : 'none' }}>
                  
                  <div className="groupRow">
                    <div className="groupTitle p">Основное</div>
                    <div>
                      <input
                        className="input"
                        name="title"
                        placeholder="Название кастинга / проект"
                        required
                        defaultValue={
                          castData ? `${castData.title || ''}${castData.project ? ` — ${castData.project}` : ''}` : ''
                        }
                      />
                    </div>
                  </div>
                  <div className="groupRow">
                    <div className="groupTitle p">Роль и город</div>
                    <div className="row2">
                      <input className="input" name="role_title" placeholder="Роль" defaultValue={castData?.role_title || ''} />
                      <input className="input" name="city" placeholder="Город" defaultValue={castData?.city || ''} />
                    </div>
                  </div>
                  <div className="groupRow">
                    <div className="groupTitle p">Описание</div>
                    <div>
                      <textarea className="input" name="description" placeholder="Описание (опционально)" style={{ minHeight: 80 }} defaultValue={castData?.description || ''} />
                    </div>
                  </div>
                </div>

                {/* Step 2: Look */}
                <div className="section" style={{ display: step === 1 ? 'block' : 'none' }}>
                  <div className="groupRow">
                    <div className="groupTitle p">Пол</div>
                    <div className="chipGroup">
                      <label><input type="radio" name="sex" value="" defaultChecked={!castData?.sex} /><span className="toggleOpt">Любой</span></label>
                      <label><input type="radio" name="sex" value="Мужской" defaultChecked={castData?.sex === 'Мужской'} /><span className="toggleOpt">Мужской</span></label>
                      <label><input type="radio" name="sex" value="Женский" defaultChecked={castData?.sex === 'Женский'} /><span className="toggleOpt">Женский</span></label>
                    </div>
                  </div>
                  <div className="groupRow">
                    <div className="groupTitle p">Типаж</div>
                    <div className="chipGroup">
                      <label><input type="radio" name="look_type" value="" defaultChecked={!castData?.look_type} /><span className="toggleOpt">Любой</span></label>
                      <label><input type="radio" name="look_type" value="Европейский" defaultChecked={castData?.look_type === 'Европейский'} /><span className="toggleOpt">Европейский</span></label>
                      <label><input type="radio" name="look_type" value="Славянский" defaultChecked={castData?.look_type === 'Славянский'} /><span className="toggleOpt">Славянский</span></label>
                      <label><input type="radio" name="look_type" value="Восточный" defaultChecked={castData?.look_type === 'Восточный'} /><span className="toggleOpt">Восточный</span></label>
                      <label><input type="radio" name="look_type" value="Кавказский" defaultChecked={castData?.look_type === 'Кавказский'} /><span className="toggleOpt">Кавказский</span></label>
                    </div>
                  </div>
                  <div className="groupRow">
                    <div className="groupTitle p">Телосложение</div>
                    <div className="chipGroup">
                      <label><input type="radio" name="body_type" value="" defaultChecked={!castData?.body_type} /><span className="toggleOpt">Любое</span></label>
                      <label><input type="radio" name="body_type" value="Худощавое" defaultChecked={castData?.body_type === 'Худощавое'} /><span className="toggleOpt">Худощавое</span></label>
                      <label><input type="radio" name="body_type" value="Стройное" defaultChecked={castData?.body_type === 'Стройное'} /><span className="toggleOpt">Стройное</span></label>
                      <label><input type="radio" name="body_type" value="Спортивное" defaultChecked={castData?.body_type === 'Спортивное'} /><span className="toggleOpt">Спортивное</span></label>
                      <label><input type="radio" name="body_type" value="Плотное" defaultChecked={castData?.body_type === 'Плотное'} /><span className="toggleOpt">Плотное</span></label>
                    </div>
                  </div>
                  <div className="groupRow">
                    <div className="groupTitle p">Волосы</div>
                    <div className="chipGroup">
                      <label><input type="radio" name="hair_color" value="" defaultChecked={!castData?.hair_color} /><span className="toggleOpt">Любой</span></label>
                      <label><input type="radio" name="hair_color" value="Блонд" defaultChecked={castData?.hair_color === 'Блонд'} /><span className="toggleOpt">Блонд</span></label>
                      <label><input type="radio" name="hair_color" value="Русый" defaultChecked={castData?.hair_color === 'Русый'} /><span className="toggleOpt">Русый</span></label>
                      <label><input type="radio" name="hair_color" value="Шатен" defaultChecked={castData?.hair_color === 'Шатен'} /><span className="toggleOpt">Шатен</span></label>
                      <label><input type="radio" name="hair_color" value="Брюнет" defaultChecked={castData?.hair_color === 'Брюнет'} /><span className="toggleOpt">Брюнет</span></label>
                      <label><input type="radio" name="hair_color" value="Рыжий" defaultChecked={castData?.hair_color === 'Рыжий'} /><span className="toggleOpt">Рыжий</span></label>
                    </div>
                  </div>
                  <div className="groupRow">
                    <div className="groupTitle p">Глаза</div>
                    <div className="chipGroup">
                      <label><input type="radio" name="eye_color" value="" defaultChecked={!castData?.eye_color} /><span className="toggleOpt">Любые</span></label>
                      <label><input type="radio" name="eye_color" value="Голубые" defaultChecked={castData?.eye_color === 'Голубые'} /><span className="toggleOpt">Голубые</span></label>
                      <label><input type="radio" name="eye_color" value="Зелёные" defaultChecked={castData?.eye_color === 'Зелёные'} /><span className="toggleOpt">Зелёные</span></label>
                      <label><input type="radio" name="eye_color" value="Карие" defaultChecked={castData?.eye_color === 'Карие'} /><span className="toggleOpt">Карие</span></label>
                      <label><input type="radio" name="eye_color" value="Серые" defaultChecked={castData?.eye_color === 'Серые'} /><span className="toggleOpt">Серые</span></label>
                    </div>
                  </div>
                </div>

                {/* Step 3: Params */}
                <div className="section" style={{ display: step === 2 ? 'block' : 'none' }}>
                  <div className="groupRow">
                    <div className="groupTitle p">Язык</div>
                    <div className="row2">
                      <input className="input" name="lang" placeholder="Язык" defaultValue={castData?.lang || ''} />
                      <div />
                    </div>
                  </div>
                  <div className="groupRow">
                    <div className="groupTitle p">Возраст</div>
                    <div className="row2">
                      <input className="input" name="age_from" placeholder="Возраст от" inputMode="numeric" defaultValue={castData?.age_from || ''} />
                      <input className="input" name="age_to" placeholder="Возраст до" inputMode="numeric" defaultValue={castData?.age_to || ''} />
                    </div>
                  </div>
                  <div className="groupRow">
                    <div className="groupTitle p">Рост</div>
                    <div className="row2">
                      <input className="input" name="height_min" placeholder="Рост от, см" inputMode="numeric" defaultValue={castData?.height_min || ''} />
                      <input className="input" name="height_max" placeholder="Рост до, см" inputMode="numeric" defaultValue={castData?.height_max || ''} />
                    </div>
                  </div>
                  <div className="groupRow">
                    <div className="groupTitle p">Вес</div>
                    <div className="row2">
                      <input className="input" name="weight_min" placeholder="Вес от, кг" inputMode="numeric" defaultValue={castData?.weight_min || ''} />
                      <input className="input" name="weight_max" placeholder="Вес до, кг" inputMode="numeric" defaultValue={castData?.weight_max || ''} />
                    </div>
                  </div>
                </div>

                {/* Step 4: Extra */}
                <div className="section" style={{ display: step === 3 ? 'block' : 'none' }}>
                  <div>
                    <textarea className="input" name="requirements" placeholder="Требования" style={{ minHeight: 80 }} defaultValue={castData?.requirements || ''} />
                  </div>
                </div>

                {/* Step 5: Files */}
                <div className="section" style={{ display: step === 4 ? 'block' : 'none' }}>
                  <div>
                    {editingId && existingFiles.length > 0 && (
                      <div className="dzFiles" style={{ marginBottom: 8 }}>
                        {existingFiles.map(f => (
                          <div key={f.id} className="dzFile" style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <a href={f.url} target="_blank" rel="noreferrer">{f.filename}</a>
                            <button type="button" className="iconBtn" title="Удалить файл" aria-label="Удалить файл" onClick={async()=>{
                              try{
                                const res = await fetch(api(`/api/castings/${editingId}/files?file_id=${f.id}`), { method:'DELETE' });
                                const dj = await res.json().catch(()=>({}));
                                if (res.ok && dj.ok) setExistingFiles(prev => prev.filter(x=>x.id!==f.id));
                              }catch(e){ console.error(e); }
                            }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <input id="filesInput" className="input" type="file" name="files" multiple style={{ display:'none' }} onChange={(e)=>{
                      const fl = Array.from(e.target.files || []);
                      setFilesState(fl);
                    }} />
                    <label htmlFor="filesInput" className="dropzone" onDragOver={(e)=>{e.preventDefault();}} onDrop={(e)=>{
                      e.preventDefault();
                      const input = document.getElementById('filesInput') as HTMLInputElement | null;
                      if (input && e.dataTransfer?.files?.length) {
                        const dt = new DataTransfer();
                        Array.from(e.dataTransfer.files).forEach(f=>dt.items.add(f));
                        input.files = dt.files;
                        setFilesState(Array.from(dt.files));
                      }
                    }}>
                      <div className="dzIcon">+</div>
                      <div className="p">{filesState.length > 0 ? `Выбрано файлов: ${filesState.length}` : 'Перетащите файлы сюда или нажмите, чтобы выбрать'}</div>
                    </label>
                    <div id="dzFiles" className="dzFiles">
                      {filesState.map((f, idx)=> (
                        <div key={idx} className="dzFile">{f.name} · {(Math.round(f.size/102.4)/10)} KB</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="modalFooter btnGroup">
                <button type="button" className="btn btn--ghost" onClick={() => setOpen(false)} disabled={submitting}>Отмена</button>
                {step > 0 && (
                  <button type="button" className="btn btn--secondary" onClick={prevStep} disabled={submitting}>Назад</button>
                )}
                {step < steps.length - 1 ? (
                  <button type="button" className="btn" onClick={nextStep} disabled={submitting}>Далее</button>
                ) : (
                  <button className="btn" type="submit" disabled={submitting}>{editingId ? (submitting ? 'Сохраняю…' : 'Сохранить') : (submitting ? 'Создаю…' : 'Создать')}</button>
                )}
              </div>
            </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
