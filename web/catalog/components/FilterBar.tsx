// web/catalog/components/FilterBar.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

const sexOptions = ["", "Мужской", "Женский"] as const;

const cityOptions = [
  "", "Алматы", "Астана", "Шымкент", "Актобе", "Караганда", "Тараз", "Павлодар",
  "Усть-Каменогорск", "Семей", "Костанай", "Кызылорда", "Атырау", "Уральск",
  "Петропавловск", "Темиртау", "Актау", "Туркестан", "Экибастуз"
] as const;

const lookOptions = [
  "", "Азиатский", "Европеоидный", "Ближневосточный", "Латинский",
  "Евразиатский", "Афроамериканский", "Индийский", "Скандинавский"
] as const;

const bodyOptions = [
  "", "Худощавое", "Стройное", "Атлетичное", "Плотное", "Полное", "Мускулистое"
] as const;

const hairColorOptions = [
  "", "Чёрные", "Каштановые", "Русые", "Светло-русые", "Блондинистые",
  "Рыжие", "Седые", "Цветные"
] as const;

const eyeColorOptions = [
  "", "Карие", "Голубые", "Зелёные", "Серые", "Чёрные", "Медовые", "Разные"
] as const;

const langOptions = [
  "", "Русский", "Казахский", "Английский", "Немецкий", "Французский",
  "Турецкий", "Китайский", "Испанский", "Итальянский", "Арабский"
] as const;

const KNOWN_KEYS = ["q","sex","city","look","body","hair","eye","lang","hmin","hmax","amin","amax"];

export default function FilterBar() {
  const router = useRouter();
  const sp = useSearchParams();

  const params = useMemo(() => new URLSearchParams(sp?.toString() ?? ""), [sp]);

  const pushParams = (p: URLSearchParams) => {
    const qs = p.toString();
    router.push(qs ? `/?${qs}` : "/");
  };

  const setParam = useCallback((k: string, v?: string) => {
    const p = new URLSearchParams(params.toString());
    const val = (v ?? "").trim();
    if (val) p.set(k, val); else p.delete(k);
    pushParams(p);
  }, [params]);

  const get = (k: string) => params.get(k) ?? "";

  const reset = () => {
    const p = new URLSearchParams(params.toString());
    for (const k of KNOWN_KEYS) p.delete(k);
    pushParams(p);
  };

  return (
    <div className="filters">
      {/* Поиск */}
      <input
        className="input"
        placeholder="Поиск по имени/описанию…"
        defaultValue={get("q")}
        onKeyDown={(e) => {
          if (e.key === "Enter") setParam("q", (e.target as HTMLInputElement).value);
        }}
        onBlur={(e)=> setParam("q", e.currentTarget.value)}
      />

      {/* Пол */}
      <select className="select" value={get("sex")} onChange={(e)=>setParam("sex", e.target.value)}>
        {sexOptions.map((v)=><option key={v} value={v}>{v || "Пол"}</option>)}
      </select>

      {/* Город */}
      <select className="select" value={get("city")} onChange={(e)=>setParam("city", e.target.value)}>
        {cityOptions.map((v)=><option key={v} value={v}>{v || "Город"}</option>)}
      </select>

      {/* Типаж */}
      <select className="select" value={get("look")} onChange={(e)=>setParam("look", e.target.value)}>
        {lookOptions.map((v)=><option key={v} value={v}>{v || "Типаж"}</option>)}
      </select>

      {/* Телосложение */}
      <select className="select" value={get("body")} onChange={(e)=>setParam("body", e.target.value)}>
        {bodyOptions.map((v)=><option key={v} value={v}>{v || "Телосложение"}</option>)}
      </select>

      {/* Язык */}
      <select className="select" value={get("lang")} onChange={(e)=>setParam("lang", e.target.value)}>
        {langOptions.map((v)=><option key={v} value={v}>{v || "Язык"}</option>)}
      </select>

      {/* Цвет волос */}
      <select className="select" value={get("hair")} onChange={(e)=>setParam("hair", e.target.value)}>
        {hairColorOptions.map((v)=><option key={v} value={v}>{v || "Цвет волос"}</option>)}
      </select>

      {/* Цвет глаз */}
      <select className="select" value={get("eye")} onChange={(e)=>setParam("eye", e.target.value)}>
        {eyeColorOptions.map((v)=><option key={v} value={v}>{v || "Цвет глаз"}</option>)}
      </select>

      {/* Рост, см */}
      <input
        className="input num"
        type="number"
        placeholder="Рост от"
        defaultValue={get("hmin")}
        onBlur={(e)=>setParam("hmin", e.currentTarget.value)}
      />
      <input
        className="input num"
        type="number"
        placeholder="Рост до"
        defaultValue={get("hmax")}
        onBlur={(e)=>setParam("hmax", e.currentTarget.value)}
      />

      {/* Игровой возраст */}
      <input
        className="input num"
        type="number"
        placeholder="Возраст от"
        defaultValue={get("amin")}
        onBlur={(e)=>setParam("amin", e.currentTarget.value)}
      />
      <input
        className="input num"
        type="number"
        placeholder="Возраст до"
        defaultValue={get("amax")}
        onBlur={(e)=>setParam("amax", e.currentTarget.value)}
      />

      {/* Сброс */}
      <button className="btn" type="button" onClick={reset}>Сбросить</button>
    </div>
  );
}