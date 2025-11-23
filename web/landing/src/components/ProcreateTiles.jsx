import React from 'react';
import { Section } from './Shared';

const items = [
  { type: 'chip', label: 'Primary', color: 'blue' },
  { type: 'chip', label: 'Cart', color: 'purple' },
  { type: 'chip', label: 'Search', color: 'cyan' },
  { type: 'text', label: 'Categorization in Mail', color: 'gray' },
  { type: 'text', label: 'Emoji Tapbacks', color: 'peach' },
  { type: 'media', label: 'Showcase', color: 'teal', span: 'w2 h2' },
  { type: 'text', label: 'Text effects', color: 'indigo' },
  { type: 'chip', label: 'Game Mode', color: 'pink' },
  { type: 'media', label: 'Locked & Hidden apps', color: 'magenta', span: 'w2 h1' },
  { type: 'text', label: 'Home Screen customization', color: 'green' },
  { type: 'media', label: 'Control Center', color: 'aqua', span: 'w2 h2' },
  { type: 'text', label: 'RCS', color: 'yellow' },
  { type: 'text', label: 'Send Later in Messages', color: 'orange' },
  { type: 'media', label: 'Maps', color: 'lime', span: 'w2 h1' },
];

const Tile = ({ type, label, color, span }) => {
  const spanClass = span ? span : 'w1 h1';
  if (type === 'media') {
    return (
      <div className={`pc-tile ${spanClass} g-${color}`}>
        <div className="pc-media" />
        <div className="pc-caption">{label}</div>
      </div>
    );
  }
  if (type === 'chip') {
    return (
      <div className={`pc-tile ${spanClass} pc-center g-${color}`}>
        <div className="pc-chip">{label}</div>
      </div>
    );
  }
  return (
    <div className={`pc-tile ${spanClass} pc-center g-${color}`}>
      <span className="pc-text">{label}</span>
    </div>
  );
};

const ProcreateTiles = () => {
  return (
    <Section compact className="container-wide">
      <div className="pc-tiles">
        {items.map((it, i) => (
          <Tile key={i} {...it} />
        ))}
      </div>
    </Section>
  );
};

export default ProcreateTiles;
