
import { useEffect, useRef, useState } from 'react'
import { authenticatedFetch } from '../services/api'

function Files({ theme = 'dark' }) {
  const [files, setFiles] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [classification, setClassification] = useState('PUBLIC')
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [message, setMessage] = useState('')
  const [policyResults, setPolicyResults] = useState({})
  const [sharingFileId, setSharingFileId] = useState(null)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [sharing, setSharing] = useState(false)
  const [sharedFiles, setSharedFiles] = useState([])
  const [revokingFileId, setRevokingFileId] = useState(null)
  const [revokeEmail, setRevokeEmail] = useState('')
  const [revoking, setRevoking] = useState(false)

  const fileInputRef = useRef(null)
  const isDark = theme === 'dark'

  async function loadFiles() {
    try {
      const response = await authenticatedFetch('/files/')
      const data = await response.json()
      setFiles(data)
    } catch (error) {
      setMessage(`Unable to load files: ${error.message}`)
    }
  }


  async function loadSharedFiles() {
    try {
      const response = await authenticatedFetch('/files/shared-with-me')
      const data = await response.json()

      setSharedFiles(data)
    } catch (error) {
      setMessage(`Unable to load shared files: ${error.message}`)
    }
  }


  useEffect(() => {
    loadFiles()
    loadSharedFiles()
  }, [])

  function handleFileSelection(file) {
    if (file) {
      setSelectedFile(file)
      setMessage('')
    }
  }

  function handleDrop(event) {
    event.preventDefault()
    setDragging(false)

    const file = event.dataTransfer.files?.[0]
    if (file) handleFileSelection(file)
  }

  async function handleUpload(event) {
    event.preventDefault()

    if (!selectedFile) {
      setMessage('Please select a file first.')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const formData = new FormData()
      formData.append('uploaded_file', selectedFile)

      const response = await authenticatedFetch(
        `/files/upload?classification=${encodeURIComponent(classification)}`,
        {
          method: 'POST',
          body: formData,
        }
      )

      await response.json()

      setMessage('File uploaded successfully.')
      setSelectedFile(null)
      setClassification('PUBLIC')

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      await loadFiles()
    } catch (error) {
      setMessage(`Upload failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  async function handlePolicyCheck(fileId) {
    try {
      setMessage('')

      const response = await authenticatedFetch(
        `/files/${fileId}/policy-check`
      )

      const result = await response.json()

      setPolicyResults((previous) => ({
        ...previous,
        [fileId]: result,
      }))
    } catch (error) {
      setMessage(`Policy check failed: ${error.message}`)
    }
  }

  async function handleDownload(fileId, filename) {
    try {
      setMessage('')

      const response = await authenticatedFetch(
        `/files/${fileId}/download`
      )

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()

      URL.revokeObjectURL(url)
    } catch (error) {
      setMessage(`Download failed: ${error.message}`)
    }
  }


  async function handleRevoke(event) {
    event.preventDefault()

    if (revokingFileId === null || !revokeEmail.trim()) {
      setMessage('Please enter a recipient email.')
      return
    }

    setRevoking(true)
    setMessage('')

    try {
      const response = await authenticatedFetch(
        `/files/${revokingFileId}/share`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: revokeEmail.trim(),
          }),
        }
      )

      const responseText = await response.text()
      const result = responseText ? JSON.parse(responseText) : {}

      setMessage(result.message || 'File access revoked successfully.')
      setRevokingFileId(null)
      setRevokeEmail('')
    } catch (error) {
      setMessage(`Revoke failed: ${error.message}`)
    } finally {
      setRevoking(false)
    }
  }


  async function handleShare(event) {
    event.preventDefault()

    if (!sharingFileId || !recipientEmail.trim()) {
      setMessage('Please enter a recipient email.')
      return
    }

    setSharing(true)
    setMessage('')

    try {
      const response = await authenticatedFetch(
        `/files/${sharingFileId}/share`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: recipientEmail.trim(),
          }),
        }
      )


      const responseText = await response.text()

      let result = {}

      if (responseText.trim()) {
        try {
          result = JSON.parse(responseText)
        } catch {
          throw new Error(
            `Server returned invalid JSON (HTTP ${response.status})`
          )
        }
      }

      console.log('Share API status:', response.status)
      console.log('Share API response:', result)

      setMessage(result.message || 'File shared successfully.')

      setSharingFileId(null)
      setRecipientEmail('')
    } catch (error) {
      setMessage(`Sharing failed: ${error.message}`)
    } finally {
      setSharing(false)
    }
  }

  async function handleDelete(fileId) {
    if (!window.confirm('Are you sure you want to delete this file?')) {
      return
    }

    try {
      setMessage('')

      await authenticatedFetch(`/files/${fileId}`, {
        method: 'DELETE',
      })

      setMessage('File deleted successfully.')

      setPolicyResults((previous) => {
        const updated = { ...previous }
        delete updated[fileId]
        return updated
      })

      await loadFiles()
    } catch (error) {
      setMessage(`Delete failed: ${error.message}`)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    await loadFiles()
    setRefreshing(false)
  }

  function getFileIcon(filename) {
    const extension = filename?.split('.').pop()?.toLowerCase()

    const icons = {
      pdf: 'PDF',
      doc: 'DOC',
      docx: 'DOC',
      xls: 'XLS',
      xlsx: 'XLS',
      csv: 'CSV',
      png: 'IMG',
      jpg: 'IMG',
      jpeg: 'IMG',
      mp4: 'VID',
      zip: 'ZIP',
      txt: 'TXT',
    }

    return icons[extension] || 'FILE'
  }

  function getClassificationStyle(value) {
    switch (value?.toUpperCase()) {
      case 'PUBLIC':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'CONFIDENTIAL':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      case 'RESTRICTED':
        return 'bg-red-500/10 text-red-400 border-red-500/20'
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
    }
  }

  return (
    <section
      data-theme={theme}
      className="files-theme space-y-6"
    >
      <style>{`
        .files-theme {
          color: ${isDark ? '#f1f5f9' : '#172033'};
        }

        .files-theme[data-theme="light"] [class~="bg-slate-900"] {
          background-color: #ffffff;
        }

        .files-theme[data-theme="light"] [class~="bg-slate-950/50"],
        .files-theme[data-theme="light"] [class~="bg-slate-950/60"] {
          background-color: #f4f7fb;
        }

        .files-theme[data-theme="light"] [class~="bg-slate-800"],
        .files-theme[data-theme="light"] [class~="bg-slate-800/70"],
        .files-theme[data-theme="light"] [class~="bg-slate-800/40"] {
          background-color: #eef2f8;
        }

        .files-theme[data-theme="light"] [class~="text-white"],
        .files-theme[data-theme="light"] [class~="text-slate-200"] {
          color: #172033;
        }

        .files-theme[data-theme="light"] [class~="text-slate-300"] {
          color: #344258;
        }

        .files-theme[data-theme="light"] [class~="text-slate-400"] {
          color: #64748b;
        }

        .files-theme[data-theme="light"] [class~="text-slate-500"] {
          color: #718096;
        }

        .files-theme[data-theme="light"] [class~="border-slate-800"],
        .files-theme[data-theme="light"] [class~="border-slate-700"] {
          border-color: #dce3ed;
        }

        .files-theme[data-theme="light"] tbody tr:hover {
          background-color: #f4f7fb;
        }

        .files-theme[data-theme="light"] input,
        .files-theme[data-theme="light"] select {
          color: #172033;
        }

        .files-theme[data-theme="light"] select {
          background-color: #ffffff;
          border-color: #dce3ed;
        }

        .files-theme[data-theme="light"] input::file-selector-button {
          color: #ffffff;
        }

        .files-theme button:focus-visible,
        .files-theme select:focus-visible {
          outline: 2px solid #3b82f6;
          outline-offset: 3px;
        }
      `}</style>


      {/* Shared With Me */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-white">
            Shared With Me
          </h2>

          <button
            onClick={loadSharedFiles}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white"
          >
            Refresh
          </button>
        </div>

        {sharedFiles.length === 0 ? (
          <p className="text-sm text-slate-400">
            No files have been shared with you yet.
          </p>
        ) : (
          <div className="space-y-3">
            {sharedFiles.map((file) => (
              <div
                key={file.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-700 bg-slate-800/40 p-4"
              >
                <div>
                  <p className="font-medium text-white">
                    {file.filename}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Shared by: {file.shared_by}
                  </p>

                  <span className="mt-2 inline-block text-xs text-blue-400">
                    {file.classification}
                  </span>
                </div>

                <button
                  onClick={() => handleDownload(file.id, file.filename)}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white"
                >
                  Download
                </button>
              </div>
            ))}
          </div>
        )}
      </div>


      {/* Upload section */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-7">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-xl text-blue-400">
            ↑
          </div>

          <div>
            <h2 className="text-lg font-bold text-white">Upload Files</h2>
            <p className="text-sm text-slate-400">
              Securely store your files in Sovereign Cloud.
            </p>
          </div>
        </div>

        <form onSubmit={handleUpload} className="mt-6 space-y-5">
          {/* Drag and drop area */}
          <div
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition sm:p-10 ${dragging
              ? 'border-blue-400 bg-blue-500/10'
              : 'border-slate-700 bg-slate-950/50 hover:border-blue-500/60 hover:bg-blue-500/5'
              }`}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-3xl text-blue-400">
              ↑
            </div>

            <h3 className="mt-4 font-semibold text-white">
              {selectedFile
                ? 'File selected'
                : 'Drag and drop your file here'}
            </h3>

            <p className="mt-2 text-sm text-slate-400">
              or click to browse your computer
            </p>

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(event) =>
                handleFileSelection(event.target.files?.[0] ?? null)
              }
            />

            {selectedFile && (
              <div className="mx-auto mt-5 flex max-w-md items-center justify-between gap-3 rounded-lg border border-blue-500/20 bg-blue-500/10 p-3 text-left">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="rounded-lg bg-blue-500/20 px-3 py-2 text-xs font-bold text-blue-300">
                    {getFileIcon(selectedFile.name)}
                  </span>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    setSelectedFile(null)

                    if (fileInputRef.current) {
                      fileInputRef.current.value = ''
                    }
                  }}
                  className="shrink-0 text-sm text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Classification and upload */}
          <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <label
                htmlFor="classification"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Security Classification
              </label>

              <select
                id="classification"
                value={classification}
                onChange={(event) =>
                  setClassification(event.target.value)
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="PUBLIC">Public</option>
                <option value="CONFIDENTIAL">Confidential</option>
                <option value="RESTRICTED">Restricted</option>
              </select>

              <p className="mt-2 text-xs text-slate-500">
                Select the appropriate classification before uploading.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !selectedFile}
              className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Uploading...' : '↑ Upload File'}
            </button>
          </div>
        </form>

        {message && (
          <div
            role="status"
            className="mt-5 rounded-lg border border-slate-700 bg-slate-800/70 px-4 py-3 text-sm text-slate-300"
          >
            {message}
          </div>
        )}
      </div>


      {sharingFileId !== null && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h3 className="mb-4 text-lg font-bold text-white">
            Share File
          </h3>

          <form onSubmit={handleShare} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Registered User Email
              </label>

              <input
                type="email"
                required
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="Enter recipient email"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={sharing}
                className="rounded-lg bg-blue-600 px-5 py-2 text-white disabled:opacity-50"
              >
                {sharing ? 'Sharing...' : 'Share File'}
              </button>

              <button
                type="button"
                onClick={() => setSharingFileId(null)}
                className="rounded-lg border border-slate-700 px-5 py-2 text-slate-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Revoke Access Form */}
      {revokingFileId !== null && (
        <div className="rounded-2xl border border-red-900/40 bg-slate-900 p-6">
          <h3 className="mb-4 text-lg font-bold text-white">
            Revoke File Access
          </h3>

          <form onSubmit={handleRevoke} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Recipient Email
              </label>
              <input
                type="email"
                required
                value={revokeEmail}
                onChange={(event) => setRevokeEmail(event.target.value)}
                placeholder="priya@test.com"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={revoking}
                className="rounded-lg bg-red-600 px-5 py-2 text-white disabled:opacity-50"
              >
                {revoking ? 'Revoking...' : 'Revoke Access'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setRevokingFileId(null)
                  setRevokeEmail('')
                }}
                className="rounded-lg border border-slate-700 px-5 py-2 text-slate-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* File list */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-bold text-white">My Files</h2>
            <p className="mt-1 text-sm text-slate-400">
              Manage your securely stored documents and assets.
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-blue-500 hover:text-blue-400 disabled:opacity-50"
          >
            {refreshing ? 'Refreshing...' : '↻ Refresh'}
          </button>
        </div>

        {files.length === 0 ? (
          <div className="px-5 py-14 text-center sm:px-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-2xl text-slate-400">
              ▤
            </div>

            <h3 className="mt-4 font-semibold text-white">No files found</h3>
            <p className="mt-2 text-sm text-slate-400">
              Your uploaded files will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4">File Name</th>
                  <th className="px-6 py-4">Classification</th>
                  <th className="px-6 py-4">Storage Region</th>
                  <th className="px-6 py-4">Policy Status</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {files.map((file) => {
                  const policy = policyResults[file.id]

                  return (
                    <tr
                      key={file.id}
                      className="transition hover:bg-slate-800/40"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-xs font-bold text-blue-400">
                            {getFileIcon(file.filename)}
                          </div>

                          <span className="max-w-[220px] truncate font-medium text-slate-200">
                            {file.filename}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getClassificationStyle(file.classification)}`}
                        >
                          {file.classification}
                        </span>
                      </td>

                      <td className="px-6 py-5 text-slate-400">
                        {file.storage_region ?? 'Not provided'}
                      </td>

                      <td className="px-6 py-5">
                        {!policy ? (
                          <span className="text-xs text-slate-500">
                            Not checked
                          </span>
                        ) : (
                          <div>
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${policy.compliant
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-red-500/10 text-red-400'
                                }`}
                            >
                              {policy.compliant
                                ? 'Compliant'
                                : 'Violations detected'}
                            </span>

                            {policy.violations?.length > 0 && (
                              <ul className="mt-2 max-w-xs list-disc space-y-1 pl-4 text-xs text-slate-400">
                                {policy.violations.map((violation, index) => (
                                  <li
                                    key={`${violation.rule ?? 'violation'}-${index}`}
                                  >
                                    {violation.message}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              handleDownload(file.id, file.filename)
                            }
                            className="rounded-md bg-blue-500/10 px-3 py-2 text-xs font-medium text-blue-400 transition hover:bg-blue-500/20"
                          >
                            Download
                          </button>
                          {file.classification !== 'RESTRICTED' && (
                            <button
                              onClick={() => {
                                setSharingFileId(file.id)
                                setRecipientEmail('')
                                setRevokingFileId(null)
                              }}
                              className="rounded-md bg-purple-500/10 px-3 py-2 text-xs font-medium text-purple-400 hover:bg-purple-500/20"
                            >
                              Share
                            </button>
                          )}
                          {file.classification !== 'RESTRICTED' && (
  <button
    onClick={() => {
      setRevokingFileId(file.id)
      setRevokeEmail('')
      setSharingFileId(null)
    }}
    className="rounded-md bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/20"
  >
    Revoke Access
  </button>
)}
                          <button
                            onClick={() => handlePolicyCheck(file.id)}
                            className="rounded-md bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-400 transition hover:bg-emerald-500/20"
                          >
                            Check Policy
                          </button>

                          <button
                            onClick={() => handleDelete(file.id)}
                            className="rounded-md bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/20"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

export default Files
