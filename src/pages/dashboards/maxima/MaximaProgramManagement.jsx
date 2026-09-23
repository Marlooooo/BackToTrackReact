   import { useEffect, useMemo, useState } from 'react';
   import MaximaSideBar from '../../../components/maximaSideBar';
   import './MaximaProgramManagement.css';

   function getCookie(name) {
   const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
   return match ? decodeURIComponent(match[2]) : null;
   }

   async function ensureCsrfCookie() {
   await fetch('/sanctum/csrf-cookie', { credentials: 'include' });
   }

   const EMPTY_FORM = {
   name: '',
   description: '',
   requirements: '',
   schedule: '',
   slots: '',
   tesda_accredited: true,
   status: 'active',
   };

   function MaximaProgramManagement() {
   const [programs, setPrograms] = useState([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);

   const [search, setSearch] = useState('');
   const [statusFilter, setStatusFilter] = useState('all');

   const [isModalOpen, setIsModalOpen] = useState(false);
   const [editingId, setEditingId] = useState(null);
   const [form, setForm] = useState(EMPTY_FORM);
   const [saving, setSaving] = useState(false);
   const [formError, setFormError] = useState(null);
   const [deleteTarget, setDeleteTarget] = useState(null);

   useEffect(() => {
      fetchPrograms();
   }, []);

   async function fetchPrograms() {
      setLoading(true);
      setError(null);
      try {
         const res = await fetch('/api/training-programs', {
         headers: { Accept: 'application/json' },
         credentials: 'include',
         });
         if (!res.ok) throw new Error('Could not load training programs.');
         const data = await res.json();
         setPrograms(data.data ?? data);
      } catch (err) {
         setError(err.message);
      } finally {
         setLoading(false);
      }
   }

   const visiblePrograms = useMemo(() => {
      return programs.filter((p) => {
         const matchesSearch = p.name?.toLowerCase().includes(search.trim().toLowerCase());
         const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
         return matchesSearch && matchesStatus;
      });
   }, [programs, search, statusFilter]);

   function openAddModal() {
      setEditingId(null);
      setForm(EMPTY_FORM);
      setFormError(null);
      setIsModalOpen(true);
   }

   function openEditModal(program) {
      setEditingId(program.id);
      setForm({
         name: program.name ?? '',
         description: program.description ?? '',
         requirements: program.requirements ?? '',
         schedule: program.schedule ?? '',
         slots: program.slots ?? '',
         tesda_accredited: Boolean(program.tesda_accredited),
         status: program.status ?? 'active',
      });
      setFormError(null);
      setIsModalOpen(true);
   }

   function closeModal() {
      if (saving) return;
      setIsModalOpen(false);
   }

   function handleChange(field, value) {
      setForm((prev) => ({ ...prev, [field]: value }));
   }

   async function handleSubmit(e) {
      e.preventDefault();
      setSaving(true);
      setFormError(null);

      const url = editingId ? `/api/training-programs/${editingId}` : '/api/training-programs';
      const method = editingId ? 'PUT' : 'POST';

      try {
         await ensureCsrfCookie();

         const res = await fetch(url, {
         method,
         credentials: 'include',
         headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-XSRF-TOKEN': getCookie('XSRF-TOKEN'),
         },
         body: JSON.stringify({ ...form, slots: Number(form.slots) || 0 }),
         });

         if (!res.ok) {
         const body = await res.json().catch(() => null);
         throw new Error(body?.message ?? 'Could not save the program.');
         }

         setIsModalOpen(false);
         await fetchPrograms();
      } catch (err) {
         setFormError(err.message);
      } finally {
         setSaving(false);
      }
   }

   async function confirmDelete() {
      if (!deleteTarget) return;
      try {
         await ensureCsrfCookie();

         const res = await fetch(`/api/training-programs/${deleteTarget.id}`, {
         method: 'DELETE',
         credentials: 'include',
         headers: {
            Accept: 'application/json',
            'X-XSRF-TOKEN': getCookie('XSRF-TOKEN'),
         },
         });
         if (!res.ok) throw new Error('Could not remove the program.');
         setPrograms((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      } catch (err) {
         setError(err.message);
      } finally {
         setDeleteTarget(null);
      }
   }

   return (
      <>
         <div className='maximaDashboardBody'>

         <MaximaSideBar/>

         <div className='programManagementMainDiv'>

            <div className='programManagementTopPart'>
               <h1>Program Management</h1>
               <p>Manage MAXIMA training programs and information.</p>
            </div>

            <div className='programManagementBotPart'>

               <div className='programManagementAddDiv'>
               <input
                  type="text"
                  className="programSearchInput"
                  placeholder="Search programs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
               />

               <select
                  className="programStatusFilter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
               >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
               </select>

               <button className="programAddBtn" onClick={openAddModal}>
                  + Add Program
               </button>
               </div>

               <div className='programManagementList'>
               {error && (
                  <div className="pmgmtBanner pmgmtBannerError">{error}</div>
               )}

               {loading ? (
                  <div className="pmgmtEmpty">Loading programs…</div>
               ) : visiblePrograms.length === 0 ? (
                  <div className="pmgmtEmpty">
                     <p>No programs found.</p>
                     <span>Try a different search term or status, or add a new program.</span>
                  </div>
               ) : (
                  <table className="programTable">
                     <thead>
                     <tr>
                        <th>Program name</th>
                        <th>Schedule</th>
                        <th>Slots</th>
                        <th>TESDA</th>
                        <th>Status</th>
                        <th aria-label="Actions"></th>
                     </tr>
                     </thead>
                     <tbody>
                     {visiblePrograms.map((program) => (
                        <tr key={program.id}>
                           <td className="programTable__name">{program.name}</td>
                           <td>{program.schedule || '—'}</td>
                           <td>{program.slots}</td>
                           <td>
                           <span className={`pmgmtTag ${program.tesda_accredited ? 'pmgmtTagYes' : 'pmgmtTagNo'}`}>
                              {program.tesda_accredited ? 'Accredited' : 'Not accredited'}
                           </span>
                           </td>
                           <td>
                           <span className={`pmgmtStatus ${program.status === 'active' ? 'pmgmtStatusActive' : 'pmgmtStatusInactive'}`}>
                              {program.status === 'active' ? 'Active' : 'Inactive'}
                           </span>
                           </td>
                           <td className="programTable__actions">
                           <button className="programEditBtn" onClick={() => openEditModal(program)}>
                              Edit
                           </button>
                           <button
                              className="programDeleteBtn"
                              onClick={() => setDeleteTarget(program)}
                           >
                              Remove
                           </button>
                           </td>
                        </tr>
                     ))}
                     </tbody>
                  </table>
               )}
               </div>
            </div>

         </div>

         </div>

         {isModalOpen && (
         <div className="pmgmtModalOverlay" onClick={closeModal}>
            <div className="pmgmtModal" onClick={(e) => e.stopPropagation()}>
               <h2>{editingId ? 'Edit Program' : 'Add Program'}</h2>

               <form onSubmit={handleSubmit} className="pmgmtForm">
               <label>
                  Program name
                  <input
                     type="text"
                     value={form.name}
                     onChange={(e) => handleChange('name', e.target.value)}
                     required
                  />
               </label>

               <label>
                  Description
                  <textarea
                     rows={3}
                     value={form.description}
                     onChange={(e) => handleChange('description', e.target.value)}
                  />
               </label>

               <label>
                  Requirements
                  <textarea
                     rows={3}
                     value={form.requirements}
                     onChange={(e) => handleChange('requirements', e.target.value)}
                     placeholder="e.g. Valid ID, Certificate of Residency"
                  />
               </label>

               <div className="pmgmtFormRow">
                  <label>
                     Schedule
                     <input
                     type="text"
                     value={form.schedule}
                     onChange={(e) => handleChange('schedule', e.target.value)}
                     placeholder="e.g. Mon–Fri, 8AM–5PM"
                     />
                  </label>

                  <label>
                     Slots
                     <input
                     type="number"
                     min="0"
                     value={form.slots}
                     onChange={(e) => handleChange('slots', e.target.value)}
                     required
                     />
                  </label>
               </div>

               <div className="pmgmtFormRow">
                  <label>
                     Status
                     <select value={form.status} onChange={(e) => handleChange('status', e.target.value)}>
                     <option value="active">Active</option>
                     <option value="inactive">Inactive</option>
                     </select>
                  </label>

                  <label className="pmgmtFormCheckbox">
                     <input
                     type="checkbox"
                     checked={form.tesda_accredited}
                     onChange={(e) => handleChange('tesda_accredited', e.target.checked)}
                     />
                     TESDA accredited
                  </label>
               </div>

               {formError && (
                  <div className="pmgmtBanner pmgmtBannerError">{formError}</div>
               )}

               <div className="pmgmtModalActions">
                  <button type="button" className="pmgmtBtn pmgmtBtnGhost" onClick={closeModal} disabled={saving}>
                     Cancel
                  </button>
                  <button type="submit" className="pmgmtBtn pmgmtBtnPrimary" disabled={saving}>
                     {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add program'}
                  </button>
               </div>
               </form>
            </div>
         </div>
         )}

         {deleteTarget && (
         <div className="pmgmtModalOverlay" onClick={() => setDeleteTarget(null)}>
            <div className="pmgmtModal pmgmtModalSmall" onClick={(e) => e.stopPropagation()}>
               <h2>Remove program?</h2>
               <p>
               This will remove <strong>{deleteTarget.name}</strong>. Referrals already linked to it are not
               deleted, but the program will no longer be available for new referrals.
               </p>
               <div className="pmgmtModalActions">
               <button className="pmgmtBtn pmgmtBtnGhost" onClick={() => setDeleteTarget(null)}>
                  Cancel
               </button>
               <button className="pmgmtBtn pmgmtBtnDanger" onClick={confirmDelete}>
                  Remove program
               </button>
               </div>
            </div>
         </div>
         )}
      </>
   );
   }

   export default MaximaProgramManagement;
