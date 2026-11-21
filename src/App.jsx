import { useEffect, useMemo, useState } from 'react';
import { api } from './api';

const emptyForm = { title: '', content: '' };

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('notes_token') || '');
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('notes_user') || 'null'); } catch { return null; }
  });
  const [mode, setMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', interests: '' });
  const [noteForm, setNoteForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [notes, setNotes] = useState([]);
  const [users, setUsers] = useState([]);
  const [allNotes, setAllNotes] = useState([]);
  const [allNotesPage, setAllNotesPage] = useState(1);
  const [allNotesPagination, setAllNotesPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [adminPage, setAdminPage] = useState(1);
  const [adminPagination, setAdminPagination] = useState(null);
  const [posts, setPosts] = useState([]);
  const [postsPage, setPostsPage] = useState(1);
  const [postsPagination, setPostsPagination] = useState(null);
  const [postsError, setPostsError] = useState('');
  const [authorPosts, setAuthorPosts] = useState(null);
  const [authorPostsPage, setAuthorPostsPage] = useState(1);
  const [authorPostsPagination, setAuthorPostsPagination] = useState(null);
  const [postForm, setPostForm] = useState(emptyForm);
  const [editingUser, setEditingUser] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('notes');
  const [interestGroups, setInterestGroups] = useState([]);
  const [interestPagination, setInterestPagination] = useState(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user', interests: '' });

  const isAdmin = user?.role === 'admin';
  const clearAlerts = () => { setMessage(''); setError(''); };
  const run = async (fn) => {
    clearAlerts(); setBusy(true);
    try { await fn(); } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    if (!token) return;
    run(async () => {
      const result = await api('/auth/me', { token });
      setUser(result.user);
      localStorage.setItem('notes_user', JSON.stringify(result.user));
    }).catch?.(() => {});
  }, []);

  async function loadNotes(nextPage = page) {
    const result = await api(`/notes?page=${nextPage}&limit=8`, { token });
    setNotes(result.data); setPagination(result.pagination); setPage(nextPage);
  }
  async function loadAdminUsers(nextPage = adminPage) {
    const result = await api(`/admin/users?page=${nextPage}&limit=8`, { token });
    setUsers(result.data); setAdminPagination(result.pagination); setAdminPage(nextPage);
  }
  async function loadAdminNotes(nextPage = allNotesPage) {
    const result = await api(`/admin/notes?page=${nextPage}&limit=8`, { token });
    setAllNotes(result.data); setAllNotesPagination(result.pagination); setAllNotesPage(nextPage);
  }
  async function loadAdmin() {
    await Promise.all([loadAdminUsers(), loadAdminNotes()]);
  }
  async function loadPosts(nextPage = postsPage) {
    const result = await api(`/posts?page=${nextPage}&limit=8`);
    setPosts(result.data); setPostsPagination(result.pagination); setPostsPage(nextPage); setPostsError('');
  }
  async function loadAuthorPosts(id, nextPage = 1) {
    await run(async () => {
      const result = await api(`/users/${id}/posts?page=${nextPage}&limit=8`);
      setAuthorPosts(result.user); setAuthorPostsPage(nextPage);
      setAuthorPostsPagination(result.pagination); setTab('posts');
    });
  }
  useEffect(() => {
    if (token && user) {
      run(async () => {
        await loadNotes(1);
        if (user.role === 'admin') await loadAdmin();
      });
    }
  }, [token, user?.role]);

  async function authenticate(e) {
    e.preventDefault();
    await run(async () => {
      const path = mode === 'login' ? '/auth/login' : '/auth/register';
      const body = mode === 'login'
        ? { email: authForm.email, password: authForm.password }
        : { name: authForm.name, email: authForm.email, password: authForm.password, interests: authForm.interests.split(',').map(x => x.trim()).filter(Boolean) };
      const result = await api(path, { method: 'POST', body: JSON.stringify(body) });
      localStorage.setItem('notes_token', result.token);
      localStorage.setItem('notes_user', JSON.stringify(result.user));
      setToken(result.token); setUser(result.user); setMessage('Welcome! You are signed in.');
    });
  }

  function logout() {
    localStorage.removeItem('notes_token'); localStorage.removeItem('notes_user');
    setToken(''); setUser(null); setNotes([]); setUsers([]); setAllNotes([]);
  }

  async function saveNote(e) {
    e.preventDefault();
    await run(async () => {
      const result = await api(editingId ? `/notes/${editingId}` : '/notes', {
        token, method: editingId ? 'PUT' : 'POST', body: JSON.stringify(noteForm)
      });
      setNoteForm(emptyForm); setEditingId(null); setMessage(editingId ? 'Note updated.' : 'Note created.');
      await loadNotes(1);
      if (isAdmin) await loadAdmin();
    });
  }

  async function deleteNote(id) {
    if (!window.confirm('Delete this note permanently?')) return;
    await run(async () => {
      await api(`/notes/${id}`, { token, method: 'DELETE' });
      setMessage('Note deleted.'); await loadNotes(page);
      if (isAdmin) await loadAdmin();
    });
  }

  async function showInterests(nextPage = 1) {
    await run(async () => {
      const result = await api(`/users/group-by-interests?page=${nextPage}&limit=8`, { token });
      setInterestGroups(result.data); setInterestPagination(result.pagination); setTab('interests');
    });
  }

  async function addUser(e) {
    e.preventDefault();
    await run(async () => {
      const body = { ...newUser, interests: newUser.interests.split(',').map(x => x.trim()).filter(Boolean) };
      await api('/admin/users', { token, method: 'POST', body: JSON.stringify(body) });
      setNewUser({ name: '', email: '', password: '', role: 'user', interests: '' });
      setMessage('User created.'); await loadAdmin();
    });
  }

  function startEditingUser(user) {
    setEditingUser({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      interests: (user.interests || []).join(', ')
    });
  }

  async function updateUser(e) {
    e.preventDefault();
    await run(async () => {
      const body = {
        name: editingUser.name,
        email: editingUser.email,
        role: editingUser.role,
        interests: editingUser.interests.split(',').map(x => x.trim()).filter(Boolean)
      };
      await api(`/admin/users/${editingUser.id}`, { token, method: 'PUT', body: JSON.stringify(body) });
      setEditingUser(null); setMessage('User updated.'); await loadAdmin();
    });
  }

  async function createPost(e) {
    e.preventDefault();
    await run(async () => {
      await api('/posts', { token, method: 'POST', body: JSON.stringify(postForm) });
      setPostForm(emptyForm); setAuthorPosts(null); setAuthorPostsPagination(null); setMessage('Post created.');
      await loadPosts(1);
    });
  }

  async function removeUser(id) {
    if (!window.confirm('Delete this user, their notes, and their posts?')) return;
    await run(async () => {
      await api(`/admin/users/${id}`, { token, method: 'DELETE' });
      if (editingUser?.id === id) setEditingUser(null);
      setMessage('User and their content deleted.'); await loadAdmin();
    });
  }

  const noteCountLabel = useMemo(() => pagination ? `${pagination.total} total` : 'Your workspace', [pagination]);

  if (!token || !user) {
    return <main className="auth-shell">
      <section className="auth-card">
        <div className="brand-mark">N</div>
        <h1>Secure Notes</h1>
        {error && <div className="alert error">{error}</div>}
        {message && <div className="alert success">{message}</div>}
        <form onSubmit={authenticate} className="stack">
          {mode === 'register' && <label>Full name<input required value={authForm.name} onChange={e => setAuthForm({ ...authForm, name: e.target.value })} placeholder="Your name" /></label>}
          <label>Email address<input required type="email" value={authForm.email} onChange={e => setAuthForm({ ...authForm, email: e.target.value })} placeholder="you@example.com" /></label>
          <label>Password<input required minLength="8" type="password" value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })} placeholder="At least 8 characters" /></label>
          {mode === 'register' && <label>Interests <span className="muted">(comma separated, optional)</span><input value={authForm.interests} onChange={e => setAuthForm({ ...authForm, interests: e.target.value })} placeholder="reading, chess" /></label>}
          <button disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        </form>
        <p className="switch">{mode === 'login' ? "Don't have an account?" : 'Already registered?'} <button className="text-button" onClick={() => { clearAlerts(); setMode(mode === 'login' ? 'register' : 'login'); }}> {mode === 'login' ? 'Create account' : 'Sign in'}</button></p>
        {mode === 'login' && <p className="hint">Demo admin login:<br/><strong>admin@gmail.com</strong><br/>Password: <strong>admin1234</strong></p>}
      </section>
    </main>;
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark small">N</span><span>Secure Notes</span></div>
      <div className="profile"><div className="avatar">{user.name?.[0]?.toUpperCase()}</div><div><strong>{user.name}</strong><small>{user.role}</small></div></div>
      <nav>
        <button className={tab === 'notes' ? 'nav active' : 'nav'} onClick={() => setTab('notes')}>▤ My notes</button>
        {isAdmin && <button className={tab === 'admin' ? 'nav active' : 'nav'} onClick={() => { setTab('admin'); run(loadAdmin); }}>♙ User management</button>}
        {isAdmin && <button className={tab === 'allnotes' ? 'nav active' : 'nav'} onClick={() => { setTab('allnotes'); run(loadAdmin); }}>▧ All notes</button>}
        {isAdmin && <button className={tab === 'interests' ? 'nav active' : 'nav'} onClick={showInterests}>◎ Interest groups</button>}
        <button className={tab === 'posts' ? 'nav active' : 'nav'} onClick={() => { setTab('posts'); run(() => loadPosts(1)); }}>◉ Public posts</button>
      </nav>
      <button className="logout" onClick={logout}>↪ Sign out</button>
    </aside>

    <main className="main">
      <header className="topbar"><div><p className="eyebrow">YOUR WORKSPACE</p><h1>{tab === 'admin' ? 'User management' : tab === 'allnotes' ? 'All notes' : tab === 'interests' ? 'Users by interests' : tab === 'posts' ? 'Public posts' : 'My notes'}</h1></div><span className="role-pill">{isAdmin ? 'Administrator' : 'User'}</span></header>
      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      {tab === 'notes' && <>
        <section className="panel">
          <div className="section-heading"><div><h2>{editingId ? 'Edit note' : 'Create a note'}</h2><p className="muted">Only you can access your notes. Admins can review all notes.</p></div></div>
          <form onSubmit={saveNote} className="note-form">
            <input required maxLength="160" value={noteForm.title} onChange={e => setNoteForm({ ...noteForm, title: e.target.value })} placeholder="Note title" />
            <textarea required maxLength="20000" rows="4" value={noteForm.content} onChange={e => setNoteForm({ ...noteForm, content: e.target.value })} placeholder="Write something worth remembering…" />
            <div className="form-actions"><button disabled={busy}>{editingId ? 'Save changes' : 'Add note'}</button>{editingId && <button type="button" className="secondary" onClick={() => { setEditingId(null); setNoteForm(emptyForm); }}>Cancel</button>}</div>
          </form>
        </section>
        <section className="section-heading list-heading"><div><h2>Your notes</h2><p className="muted">{noteCountLabel}</p></div></section>
        <div className="notes-grid">
          {notes.map(note => <article className="note-card" key={note._id}><h3>{note.title}</h3><p>{note.content}</p><small>{new Date(note.createdAt).toLocaleString()}</small><div className="card-actions"><button className="text-button" onClick={() => { setEditingId(note._id); setNoteForm({ title: note.title, content: note.content }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Edit</button><button className="text-button danger-text" onClick={() => deleteNote(note._id)}>Delete</button></div></article>)}
          {!notes.length && <div className="empty">No notes yet. Create your first note above.</div>}
        </div>
        {pagination && <Pager page={pagination.page} totalPages={pagination.totalPages} onChange={p => run(() => loadNotes(p))} />}
      </>}

      {tab === 'admin' && isAdmin && <>
        <section className="panel"><h2>Add a user</h2><form className="user-form" onSubmit={addUser}>
          <input required placeholder="Full name" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })}/>
          <input required type="email" placeholder="Email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })}/>
          <input required minLength="8" type="password" placeholder="Temporary password (8+ chars)" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })}/>
          <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}><option value="user">User</option><option value="admin">Admin</option></select>
          <input placeholder="Interests (comma separated)" value={newUser.interests} onChange={e => setNewUser({ ...newUser, interests: e.target.value })}/>
          <button disabled={busy}>Create user</button>
        </form></section>
        <section className="panel"><div className="section-heading"><div><h2>All users</h2><p className="muted">Manage accounts and roles.</p></div></div>
          {editingUser && <form className="user-form edit-user-form" onSubmit={updateUser}>
            <input required placeholder="Full name" value={editingUser.name} onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}/>
            <input required type="email" placeholder="Email" value={editingUser.email} onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}/>
            <select value={editingUser.role} onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}><option value="user">User</option><option value="admin">Admin</option></select>
            <input placeholder="Interests (comma separated)" value={editingUser.interests} onChange={e => setEditingUser({ ...editingUser, interests: e.target.value })}/>
            <div className="form-actions"><button disabled={busy}>Save user</button><button type="button" className="secondary" onClick={() => setEditingUser(null)}>Cancel</button></div>
          </form>}
          <div className="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead><tbody>
            {users.map(u => <tr key={u._id}><td>{u.name}</td><td>{u.email}</td><td>{u.role}</td><td><button className="text-button" onClick={() => startEditingUser(u)}>Edit</button><button className="text-button danger-text" disabled={u._id === user.id} onClick={() => removeUser(u._id)}>Delete</button></td></tr>)}
          </tbody></table></div>
          {adminPagination && <Pager page={adminPagination.page} totalPages={adminPagination.totalPages} onChange={p => run(() => loadAdminUsers(p))} />}
        </section>
      </>}

      {tab === 'allnotes' && isAdmin && <section className="panel"><h2>Everyone's notes</h2><div className="table-wrap"><table><thead><tr><th>Title</th><th>Owner</th><th>Created</th></tr></thead><tbody>{allNotes.map(n => <tr key={n._id}><td>{n.title}</td><td>{n.userId?.name || 'Deleted user'}</td><td>{new Date(n.createdAt).toLocaleString()}</td></tr>)}</tbody></table></div>{allNotesPagination && <Pager page={allNotesPagination.page} totalPages={allNotesPagination.totalPages} onChange={p => run(() => loadAdminNotes(p))} />}</section>}

      {tab === 'interests' && <section className="panel"><div className="section-heading"><div><h2>Interest groups</h2><p className="muted">Generated using MongoDB aggregation.</p></div><button className="secondary" onClick={() => showInterests(1)}>Refresh</button></div><div className="interest-grid">{interestGroups.map(group => <article className="interest-card" key={group.interest}><h3>{group.interest}</h3><strong>{group.userCount} {group.userCount === 1 ? 'user' : 'users'}</strong><p>{group.users.map(x => x.name).join(', ')}</p></article>)}{!interestGroups.length && <div className="empty">No interest groups found.</div>}</div>{interestPagination && <Pager page={interestPagination.page} totalPages={interestPagination.totalPages} onChange={p => showInterests(p)} />}</section>}

      {tab === 'posts' && <section className="panel">
        <div className="section-heading"><div><h2>{authorPosts ? `Posts by ${authorPosts.name}` : 'Public posts'}</h2><p className="muted">Posts are visible to everyone.</p></div>{authorPosts && <button className="secondary" onClick={() => { setAuthorPosts(null); setAuthorPostsPagination(null); }}>Show all posts</button>}</div>
        {!authorPosts && <form onSubmit={createPost} className="note-form">
          <input required maxLength="160" placeholder="Post title" value={postForm.title} onChange={e => setPostForm({ ...postForm, title: e.target.value })}/>
          <textarea required maxLength="20000" rows="3" placeholder="Write a public post" value={postForm.content} onChange={e => setPostForm({ ...postForm, content: e.target.value })}/>
          <button disabled={busy}>Publish post</button>
        </form>}
        {postsError && <div className="alert error">{postsError}</div>}
        <div className="notes-grid">
          {(authorPosts?.posts || posts).map(post => <article className="note-card" key={post._id}><h3>{post.title}</h3><p>{post.content}</p><small>By {authorPosts?.name || post.userId?.name || 'Unknown author'}</small>{!authorPosts && post.userId?._id && <div className="card-actions"><button className="text-button" onClick={() => loadAuthorPosts(post.userId._id)}>More from this author</button></div>}</article>)}
          {!(authorPosts?.posts || posts).length && <div className="empty">No public posts yet.</div>}
        </div>
        {!authorPosts && postsPagination && <Pager page={postsPagination.page} totalPages={postsPagination.totalPages} onChange={p => run(() => loadPosts(p))} />}
        {authorPosts && authorPostsPagination && <Pager page={authorPostsPage} totalPages={authorPostsPagination.totalPages} onChange={p => loadAuthorPosts(authorPosts._id, p)} />}
      </section>}
    </main>
  </div>;
}

function Pager({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return <div className="pager"><button className="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button><span>Page {page} of {totalPages}</span><button className="secondary" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Next</button></div>;
}
