
import { useEffect, useState } from 'react'
import { authenticatedFetch } from '../services/api'

function Files() {
  const [files, setFiles] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [classification, setClassification] = useState('PUBLIC')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [policyResults, setPolicyResults] = useState({})

  // Fetch the current user's files
  async function loadFiles() {
    try {
      const response = await authenticatedFetch('/files/')
      const data = await response.json()
      setFiles(data)
    } catch (error) {
      setMessage(`Unable to load files: ${error.message}`)
    }
  }

  useEffect(() => {
    loadFiles()
  }, [])

  // Upload a file with its classification
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
      event.target.reset()

      await loadFiles()
    } catch (error) {
      setMessage(`Upload failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Check a file's policy compliance
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

  // Download a file
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

  // Delete a file
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

  return (
    <section className="mt-8 space-y-6">
      {/* Upload section */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-xl font-semibold text-white">
          Upload a File
        </h2>

        <form onSubmit={handleUpload} className="mt-5 space-y-4">
          <input
            type="file"
            onChange={(event) =>
              setSelectedFile(event.target.files?.[0] ?? null)
            }
            className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-white hover:file:bg-blue-500"
          />

          <div>
            <label
              htmlFor="classification"
              className="mb-2 block text-sm text-slate-300"
            >
              File Classification
            </label>

            <select
              id="classification"
              value={classification}
              onChange={(event) =>
                setClassification(event.target.value)
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white"
            >
              <option value="PUBLIC">Public</option>
              <option value="CONFIDENTIAL">Confidential</option>
              <option value="RESTRICTED">Restricted</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Uploading...' : 'Upload File'}
          </button>
        </form>

        {message && (
          <p
            role="status"
            className="mt-4 text-sm text-slate-300"
          >
            {message}
          </p>
        )}
      </div>

      {/* File list */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">
            My Files
          </h2>

          <button
            onClick={loadFiles}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            Refresh
          </button>
        </div>

        {files.length === 0 ? (
          <p className="mt-5 text-sm text-slate-400">
            No files found.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-400">
                <tr className="border-b border-slate-800">
                  <th className="py-3 pr-4">Filename</th>
                  <th className="py-3 pr-4">Classification</th>
                  <th className="py-3 pr-4">Storage Region</th>
                  <th className="py-3 pr-4">Policy Status</th>
                  <th className="py-3">Actions</th>
                </tr>
              </thead>

              <tbody>
                {files.map((file) => {
                  const policy = policyResults[file.id]

                  return (
                    <tr
                      key={file.id}
                      className="border-b border-slate-800 align-top"
                    >
                      <td className="py-4 pr-4 text-white">
                        {file.filename}
                      </td>

                      <td className="py-4 pr-4">
                        {file.classification}
                      </td>

                      <td className="py-4 pr-4">
                        {file.storage_region ?? 'Not provided'}
                      </td>

                      {/* Policy status and violations */}
                      <td className="py-4 pr-4">
                        {!policy ? (
                          <span className="text-slate-500">
                            Not checked
                          </span>
                        ) : (
                          <div>
                            <p
                              className={
                                policy.compliant
                                  ? 'font-medium text-emerald-400'
                                  : 'font-medium text-red-400'
                              }
                            >
                              {policy.compliant
                                ? 'Compliant'
                                : 'Violations detected'}
                            </p>

                            {policy.violations?.length > 0 && (
                              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-300">
                                {policy.violations.map(
                                  (violation, index) => (
                                    <li
                                      key={`${violation.rule ?? 'violation'}-${index}`}
                                    >
                                      {violation.message}
                                    </li>
                                  )
                                )}
                              </ul>
                            )}
                          </div>
                        )}
                      </td>

                      {/* All action buttons stay inside this table cell */}
                      <td className="py-4">
                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={() =>
                              handleDownload(file.id, file.filename)
                            }
                            className="text-blue-400 hover:text-blue-300"
                          >
                            Download
                          </button>

                          <button
                            onClick={() => handleDelete(file.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            Delete
                          </button>

                          <button
                            onClick={() => handlePolicyCheck(file.id)}
                            className="text-emerald-400 hover:text-emerald-300"
                          >
                            Check Policy
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
