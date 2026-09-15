import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Upload, FileText } from "lucide-react";
import { Person, WorkTask } from "@workspace/db";

interface DocumentItem {
  id: string;
  filename: string;
  url: string;
  uploadedBy: string;
  taskId?: string | null;
}

export function DocumentHub({ currentUser, allPeople, tasks }: { currentUser: Person; allPeople: Person[]; tasks: WorkTask[] }) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      // In a real app with proper auth headers
      const token = localStorage.getItem("token") || "mock-token";
      const res = await fetch("/api/assets/documents", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      setDocuments(data.items || []);
    } catch (err) {
      console.error("Failed to fetch documents", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);

    const formData = new FormData();
    formData.append("file", e.target.files[0]);
    if (selectedTaskId) {
      formData.append("taskId", selectedTaskId);
    }

    try {
      const token = localStorage.getItem("token") || "mock-token";
      const res = await fetch("/api/assets/upload", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.file) {
        setDocuments(prev => [{
          id: data.file.id,
          filename: data.file.filename,
          url: data.file.url,
          uploadedBy: currentUser.id,
          taskId: selectedTaskId || null,
          createdAt: new Date().toISOString()
        }, ...prev]);
        setSelectedTaskId(""); // Reset task selection
      }
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploading(false);
    }
  };

  const getUploaderName = (id: string) => {
    return allPeople.find(p => p.id === id)?.name || id;
  };

  const getTaskName = (taskId?: string | null) => {
    if (!taskId) return "General Document";
    return tasks.find(t => t.id === taskId)?.title || "Unknown Task";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Document Hub</h1>
          <p className="text-slate-500">
            {currentUser.role === "Founder" 
              ? "All company documents." 
              : currentUser.role === "Manager" 
                ? "Documents uploaded by your team." 
                : "Your uploaded documents."}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
          <select 
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            disabled={uploading}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          >
            <option value="">No specific task</option>
            {tasks.map(t => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
          <input 
            type="file" 
            id="doc-upload" 
            className="hidden" 
            onChange={handleFileUpload} 
            disabled={uploading}
          />
          <label htmlFor="doc-upload">
            <Button asChild disabled={uploading} className="cursor-pointer bg-blue-600 hover:bg-blue-700">
              <span>
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Uploading..." : "Upload Document"}
              </span>
            </Button>
          </label>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : documents.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-10">No documents found.</p>
          ) : (
            <div className="space-y-4">
              {documents.map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-4 border border-slate-800 rounded-lg hover:bg-slate-900/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-blue-900/30 text-blue-400 rounded-lg flex items-center justify-center">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-200">{doc.filename}</p>
                      <p className="text-xs text-slate-500">
                        {getTaskName(doc.taskId)} • Uploaded by {getUploaderName(doc.uploadedBy)} • {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">View</a>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
