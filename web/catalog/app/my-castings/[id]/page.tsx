// web/catalog/app/my-castings/[id]/page.tsx
"use client";
import { useEffect, useState } from "react";

export default function CastingDetail({ params }: { params: { id: string } }) {
  const castingId = Number(params.id);
  const [files, setFiles] = useState<Array<{id:number; filename:string; url:string}>>([]);

  useEffect(() => {
    fetch(`/api/castings/${castingId}/files`).then(r=>r.json()).then(d=>{
      if (d.ok) setFiles(d.items || []);
    }).catch(()=>{});
  }, [castingId]);

  return (
    <div>
      <div className="row space">
        <h1 className="h1">Настройки кастинга</h1>
        <form action="/api/upload" method="post" encType="multipart/form-data" className="row">
          <input type="hidden" name="casting_id" value={castingId} />
          <input className="input" type="file" name="file" />
          <button className="btn" type="submit">Прикрепить файл</button>
        </form>
      </div>

      <hr className="hr" />

      <div className="section">
        <div className="sectionTitle">Файлы</div>
        {!files || files.length === 0 ? (
          <p className="p">Нет файлов</p>
        ) : (
          <div className="grid2">
            {files.map((f:any)=> (
              <a key={f.id} className="card" href={f.url} target="_blank" rel="noopener noreferrer">
                <div className="cardBody">
                  <div className="h2" style={{fontSize:14}}>{f.filename}</div>
                  <p className="p">скачать</p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="section">
        <div className="row space">
          <div className="sectionTitle">Свайп-лента</div>
          <a className="btn" href={`/feed/${castingId}`}>Открыть ленту</a>
        </div>
        <p className="p">Лента свайпов вынесена отдельно: комфортный просмотр и быстрые решения.</p>
      </div>
    </div>
  );
}
