import React from 'react';

export default function TerminalLogLine({ parsed, index }) {
  const { badge, badgeColor, badgeBg, badgeBorder, textColor, lineBg, formattedLine } = parsed;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '3px 6px',
        borderRadius: '4px',
        backgroundColor: lineBg,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
        fontSize: '12.5px',
        lineHeight: 1.5,
      }}
      data-testid={`terminal-log-line-${index}`}
    >
      {/* Número da Linha */}
      <span
        style={{
          color: '#94a3b8',
          userSelect: 'none',
          minWidth: '34px',
          textAlign: 'right',
          fontSize: '11px',
          paddingTop: '2px',
          fontFamily: 'monospace',
        }}
      >
        {index + 1}
      </span>

      {/* Badge Colorido de Tipo */}
      <span
        style={{
          fontSize: '10.5px',
          fontWeight: 700,
          padding: '1px 6px',
          borderRadius: '4px',
          color: badgeColor,
          backgroundColor: badgeBg,
          border: `1px solid ${badgeBorder}`,
          userSelect: 'none',
          letterSpacing: '0.5px',
          whiteSpace: 'nowrap',
          marginTop: '1px',
        }}
        data-testid={`badge-log-${parsed.type}`}
      >
        {badge}
      </span>

      {/* Texto do Log */}
      <span style={{ color: textColor, flex: 1 }}>
        {formattedLine}
      </span>
    </div>
  );
}
