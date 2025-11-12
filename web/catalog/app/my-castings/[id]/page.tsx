// web/catalog/app/my-castings/[id]/page.tsx
"use client";
import { useEffect, useState } from "react";
import { api, bp } from "../../../lib/http";

export default function CastingDetail({ params }: { params: { id: string } }) {
  const castingId = Number(params.id);
  const [files, setFiles] = useState<Array<{id:number; filename:string; url:string}>>([]);

  useEffect(() => {
    fetch(api(`/api/castings/${castingId}/files`)).then(r=>r.json()).then(d=>{
      if (d.ok) setFiles(d.items || []);
    }).catch(()=>{});
  }, [castingId]);

  return (
    <div style={{maxWidth:900, margin:'0 auto'}}>
      <div className="row space" style={{justifyContent:'center'}}>
        <h1 className="h1" style={{textAlign:'center'}}>Настройки кастинга</h1>
        <form action={bp('/api/upload')} method="post" encType="multipart/form-data" className="row" style={{justifyContent:'center', gap:10}}>
          <input type="hidden" name="casting_id" value={castingId} />
          <input className="input" type="file" name="file" />
          <button className="btn" type="submit">Прикрепить файл</button>
        </form>
      </div>

      <hr className="hr" />

      <div className="section">
        <div className="sectionTitle" style={{textAlign:'center'}}>Файлы</div>
        {!files || files.length === 0 ? (
          <p className="p" style={{textAlign:'center'}}>Нет файлов</p>
        ) : (
          <div className="grid2" style={{justifyItems:'center'}}>
            {files.map((f:any)=> (
              <a key={f.id} className="card" href={f.url} target="_blank" rel="noopener noreferrer">
                <div className="cardBody">
                  <div className="h2" style={{fontSize:14, textAlign:'center'}}>{f.filename}</div>
                  <p className="p" style={{textAlign:'center'}}>скачать</p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="section">
        <div className="row space" style={{justifyContent:'center'}}>
          <div className="sectionTitle" style={{textAlign:'center'}}>Свайп-лента</div>
        </div>
        <div className="row" style={{justifyContent:'center', marginTop:8}}>
          <a className="btn" href={bp(`/feed/${castingId}`)}>Открыть ленту</a>
        </div>
        <p className="p" style={{textAlign:'center'}}>Лента свайпов вынесена отдельно: комфортный просмотр и быстрые решения.</p>
      </div>
    </div>
  );
}

