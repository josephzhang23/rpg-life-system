'use client';
import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useRouter } from 'next/navigation';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(d: string) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const [y, m, day] = d.split('-');
  return `${months[parseInt(m) - 1]} ${parseInt(day)}, ${y}`;
}

export default function JournalPage() {
  const router = useRouter();
  const journals = useQuery(api.character.getJournals);
  const upsertJournal = useMutation(api.character.upsertJournal);
  const deleteJournal = useMutation(api.character.deleteJournal);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedJournal = journals?.find((j: any) => j.date === selectedDate);

  function openEntry(date: string) {
    setSelectedDate(date);
    setEditing(false);
    setDraft('');
  }

  function startEdit() {
    setDraft(selectedJournal?.content ?? '');
    setEditing(true);
  }

  function newEntry() {
    const d = todayISO();
    setSelectedDate(d);
    setDraft('');
    setEditing(true);
  }

  async function save() {
    if (!selectedDate || !draft.trim()) return;
    setSaving(true);
    await upsertJournal({ date: selectedDate, content: draft.trim() });
    setSaving(false);
    setEditing(false);
  }

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
        <button onClick={newEntry} style={{
          marginLeft: 'auto',
          background: 'rgba(180,130,30,0.15)',
          border: '1px solid rgba(180,130,30,0.35)',
          color: '#c8a040', cursor: 'pointer', fontSize: '11px',
          fontFamily: "'Cinzel', serif", letterSpacing: '1px',
          padding: '4px 12px', borderRadius: '1px',
        }}>+ 新记录</button>
      </div>

      <div style={{ display: 'flex', height: 'calc(100dvh - 52px - 90px)' }}>
        {/* Sidebar — entry list */}
        <div style={{
          width: '160px', flexShrink: 0,
          borderRight: '1px solid rgba(100,70,20,0.25)',
          overflowY: 'auto',
          background: 'rgba(8,4,1,0.6)',
        }}>
          {(journals ?? []).length === 0 && (
            <div style={{ padding: '16px 12px', fontSize: '11px', color: 'rgba(200,160,80,0.3)', lineHeight: 1.6 }}>
              还没有记录。<br />写下第一篇。
            </div>
          )}
          {(journals ?? []).map((j: any) => (
            <button key={j._id} onClick={() => openEntry(j.date)} style={{
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

        {/* Main — entry content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {!selectedDate ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: '100%', color: 'rgba(200,160,80,0.2)', fontSize: '13px',
              fontFamily: "'Cinzel', serif", letterSpacing: '2px',
            }}>
              选择一篇或创建新记录
            </div>
          ) : (
            <>
              {/* Date header */}
              <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{
                    fontFamily: "'Cinzel', serif", fontSize: '11px',
                    letterSpacing: '2px', color: 'rgba(200,160,80,0.5)',
                    textTransform: 'uppercase', marginBottom: '2px',
                  }}>
                    {formatDate(selectedDate)}
                  </div>
                  {selectedJournal?.auto_generated && (
                    <div style={{ fontSize: '10px', color: 'rgba(150,110,40,0.5)', fontFamily: "'Cinzel', serif" }}>
                      自动生成
                    </div>
                  )}
                </div>
                {!editing && selectedJournal && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={startEdit} style={{
                      background: 'rgba(180,130,30,0.1)',
                      border: '1px solid rgba(180,130,30,0.3)',
                      color: 'rgba(200,160,80,0.7)', cursor: 'pointer',
                      fontSize: '10px', fontFamily: "'Cinzel', serif",
                      padding: '3px 10px', borderRadius: '1px',
                    }}>编辑</button>
                    <button onClick={async () => {
                      if (selectedJournal) {
                        await deleteJournal({ journalId: selectedJournal._id });
                        setSelectedDate(null);
                      }
                    }} style={{
                      background: 'rgba(150,30,30,0.1)',
                      border: '1px solid rgba(150,30,30,0.3)',
                      color: 'rgba(200,80,80,0.6)', cursor: 'pointer',
                      fontSize: '10px', fontFamily: "'Cinzel', serif",
                      padding: '3px 10px', borderRadius: '1px',
                    }}>删除</button>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div style={{
                borderTop: '1px solid rgba(180,130,30,0.2)',
                marginBottom: '20px',
              }} />

              {/* Content or Editor */}
              {editing ? (
                <>
                  <textarea
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    autoFocus
                    style={{
                      width: '100%', minHeight: '320px',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(180,130,30,0.25)',
                      borderRadius: '1px',
                      color: '#e8d5a3',
                      fontFamily: "'Noto Serif SC', serif",
                      fontSize: '14px', lineHeight: '1.8',
                      padding: '14px', resize: 'vertical',
                      outline: 'none',
                    }}
                    placeholder="写下今天发生的事情..."
                  />
                  <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                    <button onClick={save} disabled={saving} style={{
                      background: 'rgba(180,130,30,0.2)',
                      border: '1px solid rgba(180,130,30,0.45)',
                      color: '#c8a040', cursor: 'pointer',
                      fontSize: '11px', fontFamily: "'Cinzel', serif",
                      letterSpacing: '1px', padding: '6px 18px', borderRadius: '1px',
                    }}>
                      {saving ? '保存中...' : '保存'}
                    </button>
                    <button onClick={() => setEditing(false)} style={{
                      background: 'none',
                      border: '1px solid rgba(100,70,20,0.3)',
                      color: 'rgba(200,160,80,0.4)', cursor: 'pointer',
                      fontSize: '11px', fontFamily: "'Cinzel', serif",
                      padding: '6px 18px', borderRadius: '1px',
                    }}>取消</button>
                  </div>
                </>
              ) : selectedJournal ? (
                <div style={{
                  fontSize: '14px', lineHeight: '1.9',
                  color: 'rgba(232,213,163,0.85)',
                  whiteSpace: 'pre-wrap',
                }}>
                  {selectedJournal.content}
                </div>
              ) : (
                <div style={{ color: 'rgba(200,160,80,0.3)', fontSize: '13px' }}>
                  这一天还没有记录。
                  <button onClick={startEdit} style={{
                    display: 'block', marginTop: '12px',
                    background: 'rgba(180,130,30,0.1)',
                    border: '1px solid rgba(180,130,30,0.3)',
                    color: 'rgba(200,160,80,0.6)', cursor: 'pointer',
                    fontSize: '11px', fontFamily: "'Cinzel', serif",
                    padding: '6px 16px', borderRadius: '1px',
                  }}>开始书写</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
