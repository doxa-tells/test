// web/catalog/app/my-castings/page.tsx
import { ensureTables, listMyCastings } from "../../lib/db";
import { currentUser } from "../../lib/auth";
import { bp } from "../../lib/http";

export const dynamic = "force-dynamic";

export default async function MyCastingsPage() {
  await ensureTables();
  const user = await currentUser();
  if (!user) {
    return (
      <div>
        <h1 className="h1">Мои кастинги</h1>
        <p className="p">Авторизуйтесь, чтобы продолжить.</p>
        <a className="btn" href={bp('/login')}>Войти</a>
      </div>
    );
  }

  const items = await listMyCastings(user.id);

  return (
    <div style={{maxWidth:900, margin:'0 auto'}}>
      <div className="row" style={{justifyContent:'center'}}>
        <h1 className="h1" style={{textAlign:'center'}}>Мои кастинги</h1>
      </div>

      <div className="card" style={{marginTop:16}}>
        <div className="cardBody">
          <style>{`
            .formGrid { display:grid; gap:14px; grid-template-columns: 1fr; }
            .btnToggle { display:flex; gap:8px; flex-wrap:wrap; }
            .btnToggle label { cursor:pointer; }
            .btnToggle input { position:absolute; opacity:0; pointer-events:none; }
            .btnToggle .toggleOpt { display:inline-block; padding:8px 12px; border:1px solid #e5e7eb; border-radius:10px; background:#f9fafb; color:#111; font-weight:500; transition:all .15s ease; }
            .btnToggle .toggleOpt:hover { background:#f3f4f6; border-color:#d1d5db; }
            .btnToggle input:checked + .toggleOpt { background:#10a37f; color:#fff; border-color:#10a37f; }
            .sectionHdr { font-size:14px; font-weight:600; color:#374151; margin-bottom:6px; }
            .row2 { display:grid; gap:10px; grid-template-columns: 1fr 1fr; }
            @media (max-width: 640px) { .row2 { grid-template-columns: 1fr; } }
          `}</style>
          <div className="h2" style={{textAlign:'center', marginBottom:12}}>Создать новый кастинг</div>
          <form action={bp('/api/castings')} method="post" encType="multipart/form-data" className="formGrid">
            <div className="section">
              <div className="sectionHdr">Базовая информация</div>
              <div className="row2">
                <input className="input" name="title" placeholder="Название кастинга" required />
                <input className="input" name="project" placeholder="Проект" />
              </div>
              <div className="row2">
                <input className="input" name="role_title" placeholder="Роль" />
                <input className="input" name="city" placeholder="Город" />
              </div>
              <textarea className="input" name="description" placeholder="Описание (опционально)" />
            </div>

            <div className="section">
              <div className="sectionHdr">Внешние параметры</div>
            <div className="section" style={{padding:0}}>
              <div className="p" style={{marginBottom:6}}>Пол</div>
              <div className="btnToggle">
                <label><input type="radio" name="sex" value="" defaultChecked /><span className="toggleOpt">Любой</span></label>
                <label><input type="radio" name="sex" value="Мужской" /><span className="toggleOpt">Мужской</span></label>
                <label><input type="radio" name="sex" value="Женский" /><span className="toggleOpt">Женский</span></label>
              </div>
            </div>

            <div className="section" style={{padding:0}}>
              <div className="p" style={{marginBottom:6}}>Типаж внешности</div>
              <div className="btnToggle">
                <label><input type="radio" name="look_type" value="" defaultChecked /><span className="toggleOpt">Любой</span></label>
                <label><input type="radio" name="look_type" value="Европейский" /><span className="toggleOpt">Европейский</span></label>
                <label><input type="radio" name="look_type" value="Славянский" /><span className="toggleOpt">Славянский</span></label>
                <label><input type="radio" name="look_type" value="Восточный" /><span className="toggleOpt">Восточный</span></label>
                <label><input type="radio" name="look_type" value="Кавказский" /><span className="toggleOpt">Кавказский</span></label>
              </div>
            </div>
            <div className="section" style={{padding:0}}>
              <div className="p" style={{marginBottom:6}}>Телосложение</div>
              <div className="btnToggle">
                <label><input type="radio" name="body_type" value="" defaultChecked /><span className="toggleOpt">Любое</span></label>
                <label><input type="radio" name="body_type" value="Худощавое" /><span className="toggleOpt">Худощавое</span></label>
                <label><input type="radio" name="body_type" value="Стройное" /><span className="toggleOpt">Стройное</span></label>
                <label><input type="radio" name="body_type" value="Спортивное" /><span className="toggleOpt">Спортивное</span></label>
                <label><input type="radio" name="body_type" value="Плотное" /><span className="toggleOpt">Плотное</span></label>
              </div>
            </div>

            <div className="section" style={{padding:0}}>
              <div className="p" style={{marginBottom:6}}>Цвет волос</div>
              <div className="btnToggle">
                <label><input type="radio" name="hair_color" value="" defaultChecked /><span className="toggleOpt">Любой</span></label>
                <label><input type="radio" name="hair_color" value="Блонд" /><span className="toggleOpt">Блонд</span></label>
                <label><input type="radio" name="hair_color" value="Русый" /><span className="toggleOpt">Русый</span></label>
                <label><input type="radio" name="hair_color" value="Шатен" /><span className="toggleOpt">Шатен</span></label>
                <label><input type="radio" name="hair_color" value="Брюнет" /><span className="toggleOpt">Брюнет</span></label>
                <label><input type="radio" name="hair_color" value="Рыжий" /><span className="toggleOpt">Рыжий</span></label>
              </div>
            </div>
            <div className="section" style={{padding:0}}>
              <div className="p" style={{marginBottom:6}}>Цвет глаз</div>
              <div className="btnToggle">
                <label><input type="radio" name="eye_color" value="" defaultChecked /><span className="toggleOpt">Любые</span></label>
                <label><input type="radio" name="eye_color" value="Голубые" /><span className="toggleOpt">Голубые</span></label>
                <label><input type="radio" name="eye_color" value="Зелёные" /><span className="toggleOpt">Зелёные</span></label>
                <label><input type="radio" name="eye_color" value="Карие" /><span className="toggleOpt">Карие</span></label>
                <label><input type="radio" name="eye_color" value="Серые" /><span className="toggleOpt">Серые</span></label>
              </div>
            </div>
          </div>

            <div className="section">
              <div className="sectionHdr">Языки и параметры</div>
              <div className="row2">
                <input className="input" name="lang" placeholder="Язык" />
                <div />
              </div>
            </div>

            <div className="section">
              <div className="sectionHdr">Возраст и рост</div>
              <div className="row2">
                <input className="input" name="age_from" placeholder="Возраст от" inputMode="numeric" />
                <input className="input" name="age_to" placeholder="Возраст до" inputMode="numeric" />
              </div>
              <div className="row2">
                <input className="input" name="height_min" placeholder="Рост от, см" inputMode="numeric" />
                <input className="input" name="height_max" placeholder="Рост до, см" inputMode="numeric" />
              </div>
            </div>

            <textarea className="input" name="requirements" placeholder="Требования" style={{minHeight:80}} />
            <textarea className="input" name="notes" placeholder="Заметки" style={{minHeight:80}} />

            <div className="section">
              <div className="sectionHdr">Прикрепить файлы (бриф, референсы)</div>
              <input className="input" type="file" name="files" multiple />
            </div>

            <div className="row" style={{justifyContent:'center', marginTop:8}}>
              <button className="btn" type="submit">Создать</button>
            </div>
          </form>
        </div>
      </div>

      <hr className="hr" />

      {items.length === 0 ? (
        <p className="p" style={{textAlign:'center'}}>Пока пусто. Создайте первый кастинг.</p>
      ) : (
        <div className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:12}}>
          {items.map((c: any) => (
            <a key={c.id} href={bp(`/my-castings/${c.id}`)} className="card">
              <div className="cardBody">
                <div className="h2">{c.title}</div>
                <p className="p">{c.description || "без описания"}</p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
