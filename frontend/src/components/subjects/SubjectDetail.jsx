import { useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Plus, Layers3, Sparkles } from "lucide-react";
import { ICON_MAP } from "../../constants/icons";

export default function SubjectDetail({ subject, onBack, onAddTopic, onAddSubtopic, onStartLesson }) {
  const [topicName, setTopicName] = useState("");
  const [subtopicDrafts, setSubtopicDrafts] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const Icon = ICON_MAP[subject.icon] || BookOpen;
  const topics = subject.topics || [];
  const addTopic = async () => {
    if (!topicName.trim() || busy) return;
    setBusy(true); setError("");
    try { await onAddTopic(subject.id, { name: topicName.trim() }); setTopicName(""); }
    catch (err) { setError(err.message || "Could not add topic."); }
    finally { setBusy(false); }
  };
  const addSubtopic = async (topic) => {
    const name = (subtopicDrafts[topic.id] || "").trim();
    if (!name || busy) return;
    setBusy(true); setError("");
    try { await onAddSubtopic(subject.id, topic.id, { name }); setSubtopicDrafts((v) => ({ ...v, [topic.id]: "" })); }
    catch (err) { setError(err.message || "Could not add subtopic."); }
    finally { setBusy(false); }
  };
  return <section className="subject-detail">
    <button className="subject-back" type="button" onClick={onBack}><ArrowLeft size={16} /> All subjects</button>
    <header className="subject-detail-hero">
      <div className="subject-detail-icon" style={{ background: subject.color || "#E1EFEE" }}><Icon size={30} strokeWidth={1.7} /></div>
      <div><p className="eyebrow">Subject workspace</p><h2>{subject.name}</h2><p>{subject.learningGoal || "Build your learning path one topic at a time."}</p></div>
      <div className="subject-detail-count"><strong>{topics.length}</strong><span>topic{topics.length === 1 ? "" : "s"}</span></div>
    </header>
    {error && <p className="subject-detail-error" role="alert">{error}</p>}
    <div className="subject-detail-heading"><div><p className="eyebrow">Learning path</p><h3>Topics & subtopics</h3></div><span>{topics.reduce((n, t) => n + (t.subtopics || []).length, 0)} lessons</span></div>
    {topics.length ? <div className="subject-topic-list">{topics.map((topic, i) => {
      const subs = (topic.subtopics || []).filter((sub) => sub.id !== topic.id || sub.name !== topic.name);
      return <article className="subject-topic-card" key={topic.id || topic.name}>
        <div className="subject-topic-title"><span className="subject-topic-number">{String(i + 1).padStart(2, "0")}</span><div><h4>{topic.name}</h4><p>{subs.length} subtopic{subs.length === 1 ? "" : "s"}</p></div></div>
        {subs.length > 0 ? <ul className="subject-subtopics">{subs.map((sub, j) => <li key={sub.id || sub.name}><span>{j + 1}</span><strong>{sub.name}</strong><button type="button" onClick={() => onStartLesson(subject.name, sub.name, { unit: topic.name })}>Open lesson <ArrowRight size={14} /></button></li>)}</ul> : <p className="subject-detail-empty">Add a subtopic to turn this topic into a lesson path.</p>}
        <div className="subject-add-subtopic"><input value={subtopicDrafts[topic.id] || ""} placeholder="Add a subtopic…" aria-label={`New subtopic in ${topic.name}`} disabled={busy} onChange={(e) => setSubtopicDrafts((v) => ({ ...v, [topic.id]: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addSubtopic(topic)} /><button type="button" disabled={busy || !subtopicDrafts[topic.id]?.trim()} onClick={() => addSubtopic(topic)}><Plus size={15} /> Add subtopic</button></div>
      </article>;
    })}</div> : <div className="subject-detail-empty subject-detail-empty-card"><Sparkles size={22}/><strong>Your learning path starts here</strong><span>Add a topic to begin organizing this subject.</span></div>}
    <form className="subject-add-topic" onSubmit={(e) => { e.preventDefault(); addTopic(); }}><div><Layers3 size={18}/><span><strong>Add a topic</strong><small>Create a new unit in {subject.name}</small></span></div><input value={topicName} onChange={(e) => setTopicName(e.target.value)} placeholder="e.g. Introduction to algebra" aria-label="New topic" disabled={busy}/><button type="submit" disabled={busy || !topicName.trim()}><Plus size={16}/> Add topic</button></form>
  </section>;
}
