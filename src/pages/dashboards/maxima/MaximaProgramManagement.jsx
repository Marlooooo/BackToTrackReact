   import { useEffect, useMemo, useRef, useState } from 'react';
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
   const [imageFile, setImageFile] = useState(null);
   const [imagePreview, setImagePreview] = useState(null);
   const [existingImage, setExistingImage] = useState(null);
   const [saving, setSaving] = useState(false);
   const [formError, setFormError] = useState(null);
   const [deleteTarget, setDeleteTarget] = useState(null);
   const fileInputRef = useRef(null);

   useEffect(() => {
      fetchPrograms();
   }, []);

   // Close modals with the Escape key (never by clicking outside).
   // Remove this effect if you don't want Escape to close them either.
   useEffect(() => {
      if (!isModalOpen && !deleteTarget) return;
      function onKeyDown(e) {
         if (e.key !== 'Escape' || saving) return;
         setIsModalOpen(false);
         setDeleteTarget(null);
      }
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
   }, [isModalOpen, deleteTarget, saving]);

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

   function resetImageState() {
      setImageFile(null);
      setImagePreview(null);
      setExistingImage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
   }

   function openAddModal() {
      setEditingId(null);
      setForm(EMPTY_FORM);
      setFormError(null);
      resetImageState();
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
      setImageFile(null);
      setImagePreview(program.image_url ?? null);
      setExistingImage(program.image_url ?? null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setIsModalOpen(true);
   }

   function closeModal() {
      if (saving) return;
      setIsModalOpen(false);
   }

   function handleChange(field, value) {
      setForm((prev) => ({ ...prev, [field]: value }));
   }

   function handleImageChange(e) {
      const file = e.target.files?.[0];
      if (!file) return;
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
   }

   // Discards a newly picked file and goes back to the saved image (if any)
   function handleUndoImage() {
      setImageFile(null);
      setImagePreview(existingImage);
      if (fileInputRef.current) fileInputRef.current.value = '';
   }

   async function handleSubmit(e) {
      e.preventDefault();
      setSaving(true);
      setFormError(null);

      const url = editingId ? `/api/training-programs/${editingId}` : '/api/training-programs';

      const body = new FormData();
      body.append('name', form.name);
      body.append('description', form.description ?? '');
      body.append('requirements', form.requirements ?? '');
      body.append('schedule', form.schedule ?? '');
      body.append('slots', String(Number(form.slots) || 0));
      body.append('tesda_accredited', form.tesda_accredited ? '1' : '0');
      body.append('status', form.status);
      if (imageFile) body.append('image', imageFile);
      if (editingId) body.append('_method', 'PUT');

      try {
         await ensureCsrfCookie();

         const res = await fetch(url, {
         method: 'POST',
         credentials: 'include',
         headers: {
            Accept: 'application/json',
            'X-XSRF-TOKEN': getCookie('XSRF-TOKEN'),
         },
         body,
         });

         if (!res.ok) {
         const responseBody = await res.json().catch(() => null);
         throw new Error(responseBody?.message ?? 'Could not save the program.');
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
         <div className="maximaDashboardBody">
         <MaximaSideBar />

         <div className="programManagementMainDiv">
            <div className="programManagementTopPart">
               <h1>Program Management</h1>
               <p>Manage MAXIMA training programs and information.</p>
            </div>

            <div className="programManagementBotPart">
               <div className="programManagementAddDiv">
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

               <div className="programManagementList">
               {error && <div className="pmgmtBanner pmgmtBannerError">{error}</div>}

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
                        <th>Program</th>
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
                           <td>
                           <div className="programTable__nameCell">
                              <div className="programTable__thumb">
                                 {program.image_url ? (
                                 <img src={program.image_url} alt="" />
                                 ) : (
                                 <span className="programTable__thumbFallback">
                                    {program.name?.charAt(0)?.toUpperCase() || '?'}
                                 </span>
                                 )}
                              </div>
                              <span className="programTable__name">{program.name}</span>
                           </div>
                           </td>
                           <td>{program.schedule || '—'}</td>
                           <td>{program.slots}</td>
                           <td>
                           <span
                              className={`pmgmtTag ${
                                 program.tesda_accredited ? 'pmgmtTagYes' : 'pmgmtTagNo'
                              }`}
                           >
                              {program.tesda_accredited ? 'Accredited' : 'Not accredited'}
                           </span>
                           </td>
                           <td>
                           <span
                              className={`pmgmtStatus ${
                                 program.status === 'active'
                                 ? 'pmgmtStatusActive'
                                 : 'pmgmtStatusInactive'
                              }`}
                           >
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

         {/* Add / Edit modal (does not close when clicking outside) */}
         {isModalOpen && (
         <div className="pmgmtModalOverlay">
            <div
               className="pmgmtModal"
               role="dialog"
               aria-modal="true"
               aria-labelledby="programModalTitle"
            >
               <div className="pmgmtModalHeader">
               <div>
                  <h2 id="programModalTitle">{editingId ? 'Edit Program' : 'Add New Program'}</h2>
                  <p>
                     {editingId
                     ? 'Update the details of this training program.'
                     : 'Fill in the details to create a new training program.'}
                  </p>
               </div>
               <button
                  type="button"
                  className="pmgmtModalClose"
                  onClick={closeModal}
                  disabled={saving}
                  aria-label="Close"
               >
                  ✕
               </button>
               </div>

               <form onSubmit={handleSubmit} className="pmgmtForm">
               <div className="pmgmtModalBody">
                  {/* Image */}
                  <div className="pmgmtSection">
                     <span className="pmgmtSectionTitle">Program image</span>
                     <div className="pmgmtImageRow">
                     <div
                        className="pmgmtImageDrop"
                        onClick={() => fileInputRef.current?.click()}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                           if (e.key === 'Enter' || e.key === ' ') {
                           e.preventDefault();
                           fileInputRef.current?.click();
                           }
                        }}
                     >
                        {imagePreview ? (
                           <img src={imagePreview} alt="Preview" />
                        ) : (
                           <div className="pmgmtImageDropPlaceholder">
                           <svg
                              width="26"
                              height="26"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                           >
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="17 8 12 3 7 8" />
                              <line x1="12" y1="3" x2="12" y2="15" />
                           </svg>
                           <span>Click to upload</span>
                           </div>
                        )}
                     </div>

                     <div className="pmgmtImageInfo">
                        <p>PNG or JPG, up to 2MB.</p>
                        <p className="pmgmtHint">A clear landscape photo works best.</p>
                        <div className="pmgmtImageBtns">
                           <button
                           type="button"
                           className="pmgmtBtn pmgmtBtnGhost pmgmtBtnSm"
                           onClick={() => fileInputRef.current?.click()}
                           >
                           {imagePreview ? 'Change' : 'Upload'}
                           </button>
                           {imageFile && (
                           <button
                              type="button"
                              className="pmgmtBtn pmgmtBtnGhost pmgmtBtnSm"
                              onClick={handleUndoImage}
                           >
                              Undo
                           </button>
                           )}
                        </div>
                     </div>
                     </div>
                     <input
                     ref={fileInputRef}
                     type="file"
                     accept="image/*"
                     onChange={handleImageChange}
                     hidden
                     />
                  </div>

                  {/* Program information */}
                  <div className="pmgmtSection">
                     <span className="pmgmtSectionTitle">Program information</span>

                     <label className="pmgmtField">
                     <span className="pmgmtLabel">
                        Program name <em>*</em>
                     </span>
                     <input
                        type="text"
                        value={form.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        placeholder="e.g. Welding NC II"
                        required
                     />
                     </label>

                     <label className="pmgmtField">
                     <span className="pmgmtLabel">Description</span>
                     <textarea
                        rows={3}
                        maxLength={500}
                        value={form.description}
                        onChange={(e) => handleChange('description', e.target.value)}
                        placeholder="Briefly describe what this program covers"
                     />
                     <span className="pmgmtCounter">{form.description.length}/500</span>
                     </label>

                     <label className="pmgmtField">
                     <span className="pmgmtLabel">Requirements</span>
                     <textarea
                        rows={3}
                        value={form.requirements}
                        onChange={(e) => handleChange('requirements', e.target.value)}
                        placeholder="e.g. Valid ID, Certificate of Residency"
                     />
                     </label>
                  </div>

                  {/* Schedule & availability */}
                  <div className="pmgmtSection">
                     <span className="pmgmtSectionTitle">Schedule &amp; availability</span>

                     <div className="pmgmtFormRow">
                     <label className="pmgmtField">
                        <span className="pmgmtLabel">Schedule</span>
                        <input
                           type="text"
                           value={form.schedule}
                           onChange={(e) => handleChange('schedule', e.target.value)}
                           placeholder="e.g. Mon–Fri, 8AM–5PM"
                        />
                     </label>

                     <label className="pmgmtField">
                        <span className="pmgmtLabel">
                           Slots <em>*</em>
                        </span>
                        <input
                           type="number"
                           min="0"
                           value={form.slots}
                           onChange={(e) => handleChange('slots', e.target.value)}
                           placeholder="0"
                           required
                        />
                     </label>
                     </div>

                     <label className="pmgmtField">
                     <span className="pmgmtLabel">Status</span>
                     <select
                        value={form.status}
                        onChange={(e) => handleChange('status', e.target.value)}
                     >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                     </select>
                     </label>

                     <label className="pmgmtSwitchRow">
                     <div>
                        <span className="pmgmtLabel">TESDA accredited</span>
                        <span className="pmgmtHint">
                           Turn on if this program is accredited by TESDA.
                        </span>
                     </div>
                     <span className="pmgmtSwitch">
                        <input
                           type="checkbox"
                           checked={form.tesda_accredited}
                           onChange={(e) => handleChange('tesda_accredited', e.target.checked)}
                        />
                        <span className="pmgmtSwitchTrack" />
                     </span>
                     </label>
                  </div>

                  {formError && (
                     <div className="pmgmtBanner pmgmtBannerError pmgmtBannerInModal" role="alert">
                     {formError}
                     </div>
                  )}
               </div>

               <div className="pmgmtModalFooter">
                  <button
                     type="button"
                     className="pmgmtBtn pmgmtBtnGhost"
                     onClick={closeModal}
                     disabled={saving}
                  >
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

         {/* Remove confirmation modal (does not close when clicking outside) */}
         {deleteTarget && (
         <div className="pmgmtModalOverlay">
            <div
               className="pmgmtModal pmgmtModalSmall"
               role="alertdialog"
               aria-modal="true"
               aria-labelledby="deleteModalTitle"
            >
               <div className="pmgmtConfirmBody">
               <div className="pmgmtConfirmIcon">
                  <svg
                     width="24"
                     height="24"
                     viewBox="0 0 24 24"
                     fill="none"
                     stroke="currentColor"
                     strokeWidth="2"
                     strokeLinecap="round"
                     strokeLinejoin="round"
                  >
                     <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                     <line x1="12" y1="9" x2="12" y2="13" />
                     <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
               </div>
               <h2 id="deleteModalTitle">Remove program?</h2>
               <p>
                  This will remove <strong>{deleteTarget.name}</strong>. Referrals already linked to
                  it are not deleted, but the program will no longer be available for new referrals.
               </p>
               </div>
               <div className="pmgmtModalFooter pmgmtModalFooterCenter">
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