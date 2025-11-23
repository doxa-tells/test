import React from 'react';
import { Section, Card } from './Shared';

/* Reference-style mosaic above "Почему выбирают Caster AI".
   Empty tiles are intentional placeholders for future images/videos. */
const tiles = [
  { type: 'media', span: 'span-2x2', label: 'Photos' },
  { type: 'chip', span: 'span-1x1', label: 'Primary' },
  { type: 'chip', span: 'span-1x1', label: 'Cart' },
  { type: 'chip', span: 'span-1x1', label: 'Search' },
  { type: 'text', span: 'span-2x1', label: 'Categorization in Mail' },
  { type: 'text', span: 'span-2x1', label: 'Emoji Tapbacks' },
  { type: 'media', span: 'span-3x2', label: 'iOS' },
  { type: 'text', span: 'span-2x1', label: 'Text effects' },
  { type: 'chip', span: 'span-1x1', label: 'Game Mode' },
  { type: 'media', span: 'span-2x1', label: 'Locked & Hidden apps' },
  { type: 'text', span: 'span-2x1', label: 'Home Screen customization' },
  { type: 'media', span: 'span-2x2', label: 'Control Center' },
  { type: 'text', span: 'span-1x1', label: 'RCS' },
  { type: 'text', span: 'span-2x1', label: 'Send Later in Messages' },
  { type: 'media', span: 'span-2x1', label: 'Maps' },
  { type: 'media', span: 'span-1x1', label: 'App Icon' },
  { type: 'media', span: 'span-2x2', label: 'iPhone' },
];

const Tile = ({ type, label, span }) => {
  if (type === 'media') {
    return (
      <div className={`mosaic-tile ${span}`}>
        <div className="media-placeholder" />
        <div className="tile-caption">{label}</div>
      </div>
    );
  }
  if (type === 'chip') {
    return (
      <div className={`mosaic-tile ${span}`}>
        <div className="chip">{label}</div>
      </div>
    );
  }
  return (
    <Card className={`mosaic-card ${span}`}>
      <span className="mosaic-text">{label}</span>
    </Card>
  );
};

const RefMosaic = () => {
  return (
    <Section compact className="container-wide">
      <div className="mosaic-grid">
        {tiles.map((t, i) => (
          <Tile key={i} {...t} />
        ))}
      </div>
    </Section>
  );
};

export default RefMosaic;
