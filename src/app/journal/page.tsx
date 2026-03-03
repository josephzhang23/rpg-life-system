'use client';
import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';

function formatDate(d: string) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const [y, m, day] = d.split('-');
  return `${months[parseInt(m) - 1]} ${parseInt(day)}, ${y}`;
}

export default function JournalPage() {
  const router = useRouter();
  const journals = useQuery(api.character.getJournals);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const selectedJournal = journals?.find((j: any) => j.date === selectedDate);

  return (
    <div style={{
      height: '100dvh',
      overflow: 'hidden',
      background: 'linear-gradient(160deg, #0a0610 0%, #0d0a04 50%, #080412 100%)',
      fontFamily: "'Noto Serif SC', serif",
      color: '#e8d5a3',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(90deg, rgba(15,8,2,0.98), rgba(8,4,1,0.97), rgba(15,8,2,0.98))',
        borderBottom: '1px solid rgba(200,160,50,0.25)',
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        <button onClick={() => router.push('/')} style={{
          background: 'none', border: 'none', color: 'rgba(200,160,80,0.5)',
          cursor: 'pointer', fontSize: '16px', padding: '0 4px',
        }}>←</button>
        <span style={{
          fontFamily: "'Cinzel', serif", fontSize: '13px', letterSpacing: '3px',
          color: '#c8a040', textTransform: 'uppercase', fontWeight: 700,
        }}>📖 冒险日志</span>
      </div>

      <div style={{ display: 'flex', height: 'calc(100dvh - 52px - 90px)' }}>
        {/* Sidebar */}
        <div style={{
          width: '160px', flexShrink: 0,
          borderRight: '1px solid rgba(100,70,20,0.25)',
          overflowY: 'auto',
          background: 'rgba(8,4,1,0.6)',
        }}>
          {(journals ?? []).length === 0 && (
            <div style={{ padding: '16px 12px', fontSize: '11px', color: 'rgba(200,160,80,0.3)', lineHeight: 1.6 }}>
              还没有记录。
            </div>
          )}
          {(journals ?? []).map((j: any) => (
            <button key={j._id} onClick={() => setSelectedDate(j.date)} style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '10px 12px',
              background: selectedDate === j.date ? 'rgba(180,130,30,0.12)' : 'transparent',
              borderBottom: '1px solid rgba(100,70,20,0.15)',
              border: 'none',
              borderLeft: selectedDate === j.date ? '2px solid rgba(200,160,50,0.7)' : '2px solid transparent',
              cursor: 'pointer', color: selectedDate === j.date ? '#e8d5a3' : 'rgba(200,160,80,0.5)',
            }}>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.5px' }}>
                {j.date.slice(5)}
              </div>
              <div style={{ fontSize: '10px', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {j.content.slice(0, 28)}
              </div>
            </button>
          ))}
        </div>

        {/* Main */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {!selectedDate ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: '100%', color: 'rgba(200,160,80,0.2)', fontSize: '13px',
              fontFamily: "'Cinzel', serif", letterSpacing: '2px',
            }}>
              选择一篇日志
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '16px' }}>
                <div style={{
                  fontFamily: "'Cinzel', serif", fontSize: '11px',
                  letterSpacing: '2px', color: 'rgba(200,160,80,0.5)',
                  textTransform: 'uppercase', marginBottom: '2px',
                }}>
                  {formatDate(selectedDate)}
                </div>
              </div>
              <div style={{ borderTop: '1px solid rgba(180,130,30,0.2)', marginBottom: '20px' }} />
              {selectedJournal ? (
                <div style={{ fontSize: '14px', lineHeight: '1.9', color: 'rgba(232,213,163,0.85)' }}>
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p style={{ marginBottom: '1em' }}>{children}</p>,
                      img: ({ src, alt }) => (
                        <img
                          src={src}
                          alt={alt ?? ''}
                          style={{ maxWidth: '100%', borderRadius: '6px', margin: '12px 0', display: 'block' }}
                        />
                      ),
                      strong: ({ children }) => <strong style={{ color: '#f0c060' }}>{children}</strong>,
                      em: ({ children }) => <em style={{ color: 'rgba(232,213,163,0.7)' }}>{children}</em>,
                      code: ({ children }) => {
                        const text = String(children).trim();
                        const statColors: Record<string, { bg: string; border: string; color: string }> = {
                          INT:  { bg: 'rgba(96,160,255,0.12)',  border: 'rgba(96,160,255,0.4)',  color: '#60a0ff' },
                          DISC: { bg: 'rgba(255,128,64,0.12)',  border: 'rgba(255,128,64,0.4)',  color: '#ff8040' },
                          STR:  { bg: 'rgba(255,64,96,0.12)',   border: 'rgba(255,64,96,0.4)',   color: '#ff4060' },
                          SOC:  { bg: 'rgba(64,216,144,0.12)',  border: 'rgba(64,216,144,0.4)',  color: '#40d890' },
                          CRE:  { bg: 'rgba(192,96,255,0.12)', border: 'rgba(192,96,255,0.4)',  color: '#c060ff' },
                        };
                        const match = text.match(/^([+-]\d+)\s+(INT|DISC|STR|SOC|CRE)(\s+XP)?$/);
                        if (match) {
                          const stat = match[2];
                          const c = statColors[stat];
                          return (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              background: c.bg, border: `1px solid ${c.border}`,
                              borderRadius: '3px', padding: '1px 7px',
                              fontFamily: "'Cinzel', serif", fontSize: '11px',
                              color: c.color, letterSpacing: '0.5px',
                              verticalAlign: 'middle', margin: '0 2px',
                              boxShadow: `0 0 6px ${c.border}`,
                            }}>
                              {match[1]} {stat}
                            </span>
                          );
                        }
                        return <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: '3px', fontSize: '12px' }}>{children}</code>;
                      },
                    }}
                  >
                    {selectedJournal.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <div style={{ color: 'rgba(200,160,80,0.25)', fontSize: '13px' }}>这一天还没有记录。</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
