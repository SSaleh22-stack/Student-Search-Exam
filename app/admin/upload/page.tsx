"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Upload, FileSpreadsheet, CheckCircle, XCircle, Loader2, LogOut, RefreshCw, Settings, Info, ChevronDown, ChevronUp, User, Users, X, Trash2, CheckSquare, Square, Shield, Plus, Edit2 } from "lucide-react";
import { safeJsonParse } from "@/lib/utils";

interface Dataset {
  id: string;
  name: string;
  createdAt: string;
  isActive: boolean;
  type?: string;
}

interface HeaderMapping {
  [key: string]: string;
}

interface ExamData {
  id: string;
  courseCode: string;
  courseName: string;
  classNo: string;
  examDate: string;
  startTime: string;
  endTime: string;
  place: string;
  period: string;
  rows?: number | null;
  seats?: number | null;
}

interface EnrollmentData {
  id: string;
  studentId: string;
  courseCode: string;
  classNo: string;
}

interface LecturerExamData {
  id: string;
  lecturerName: string;
  role?: string;
  grade?: string;
  examCode?: string;
  section: string;
  courseCode: string;
  courseName: string;
  numberOfStudents?: number;
  room: string;
  column?: string;
  day?: string;
  examDate: string;
  examPeriod: string;
  periodStart: string;
  invigilator?: string;
}

interface DatasetDetails {
  dataset: {
    id: string;
    name: string;
    createdAt: string;
    isActive: boolean;
    type?: string;
  };
  summary: {
    totalExams: number;
    totalLecturerExams: number;
    totalEnrollments: number;
    uniqueCourses: number;
    uniqueStudents: number;
    uniqueLecturers: number;
  };
  exams: ExamData[];
  lecturerExams?: LecturerExamData[];
  enrollments: EnrollmentData[];
}

export default function AdminUploadPage() {
  const router = useRouter();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadType, setUploadType] = useState<"student" | "lecturer" | null>(null);
  const [datasetName, setDatasetName] = useState("");
  const [examFiles, setExamFiles] = useState<File[]>([]);
  const [enrollFiles, setEnrollFiles] = useState<File[]>([]);
  const [lecturerFiles, setLecturerFiles] = useState<File[]>([]);
  
  // Header mapping states
  const [examHeaders, setExamHeaders] = useState<string[]>([]);
  const [enrollHeaders, setEnrollHeaders] = useState<string[]>([]);
  const [lecturerHeaders, setLecturerHeaders] = useState<string[]>([]);
  const [examMapping, setExamMapping] = useState<HeaderMapping>({});
  const [enrollMapping, setEnrollMapping] = useState<HeaderMapping>({});
  const [lecturerMapping, setLecturerMapping] = useState<HeaderMapping>({});
  const [showMapping, setShowMapping] = useState(false);
  const [examAutoDetectSuccess, setExamAutoDetectSuccess] = useState(false);
  
  // Dataset details states
  const [expandedDataset, setExpandedDataset] = useState<string | null>(null);
  const [datasetDetails, setDatasetDetails] = useState<Record<string, DatasetDetails>>({});
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null);
  
  // Search page settings
  const [studentSearchActive, setStudentSearchActive] = useState(true);
  const [lecturerSearchActive, setLecturerSearchActive] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [readingHeaders, setReadingHeaders] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  // Dataset selection
  const [selectedDatasets, setSelectedDatasets] = useState<Set<string>>(new Set());
  
  // Admin management (head admin only)
  const [currentAdmin, setCurrentAdmin] = useState<{ username: string; isHeadAdmin: boolean; canManageSettings?: boolean } | null>(null);
  const [admins, setAdmins] = useState<any[]>([]);
  const [showAdminManagement, setShowAdminManagement] = useState(false);
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [newAdminUsername, setNewAdminUsername] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newAdminIsHead, setNewAdminIsHead] = useState(false);
  const [newAdminCanUpload, setNewAdminCanUpload] = useState(true);
  const [newAdminCanManageDatasets, setNewAdminCanManageDatasets] = useState(true);
  const [newAdminCanManageSettings, setNewAdminCanManageSettings] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<string | null>(null);
  const [editAdminUsername, setEditAdminUsername] = useState("");
  const [editAdminPassword, setEditAdminPassword] = useState("");
  const [editAdminIsHead, setEditAdminIsHead] = useState(false);
  const [editAdminCanUpload, setEditAdminCanUpload] = useState(true);
  const [editAdminCanManageDatasets, setEditAdminCanManageDatasets] = useState(true);
  const [editAdminCanManageSettings, setEditAdminCanManageSettings] = useState(false);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/check");
      if (!res.ok) {
        router.push("/admin");
      }
    } catch {
      router.push("/admin");
    }
  }, [router]);

  useEffect(() => {
    checkAuth();
    loadDatasets();
    loadSettings();
    loadCurrentAdmin();
  }, [checkAuth]);

  const loadCurrentAdmin = async () => {
    try {
      const res = await fetch("/api/admin/check");
      if (res.ok) {
        const data = await safeJsonParse(res);
        if (data.authenticated && data.admin) {
          setCurrentAdmin(data.admin);
          if (data.admin.isHeadAdmin && showAdminManagement) {
            loadAdmins();
          }
        }
      }
    } catch (err) {
      console.error("Failed to load admin info:", err);
    }
  };

  const loadAdmins = async () => {
    try {
      const res = await fetch("/api/admin/admins");
      if (res.ok) {
        const data = await safeJsonParse(res);
        setAdmins(data.admins || []);
      } else {
        const errorData = await safeJsonParse(res);
        setError(errorData.error || "فشل تحميل المسؤولين");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل المسؤولين");
    }
  };

  const handleCreateAdmin = async () => {
    if (!newAdminUsername.trim() || !newAdminPassword.trim()) {
      setError("اسم المستخدم وكلمة المرور مطلوبان");
      return;
    }

    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newAdminUsername.trim(),
          password: newAdminPassword,
          isHeadAdmin: newAdminIsHead,
          canUpload: newAdminCanUpload,
          canManageDatasets: newAdminCanManageDatasets,
          canManageSettings: newAdminCanManageSettings,
        }),
      });

      const data = await safeJsonParse(res);

      if (!res.ok) {
        throw new Error(data.error || "فشل إنشاء المسؤول");
      }

      setSuccess(`تم إنشاء المسؤول "${newAdminUsername}" بنجاح`);
      setNewAdminUsername("");
      setNewAdminPassword("");
      setNewAdminIsHead(false);
      setNewAdminCanUpload(true);
      setNewAdminCanManageDatasets(true);
      setNewAdminCanManageSettings(false);
      setShowCreateAdminModal(false);
      loadAdmins();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل إنشاء المسؤول");
    }
  };

  const handleEditAdmin = async (adminId: string) => {
    if (!editAdminUsername.trim()) {
      setError("اسم المستخدم مطلوب");
      return;
    }

    try {
      const updateData: any = {
        username: editAdminUsername.trim(),
        isHeadAdmin: editAdminIsHead,
        canUpload: editAdminCanUpload,
        canManageDatasets: editAdminCanManageDatasets,
        canManageSettings: editAdminCanManageSettings,
      };

      if (editAdminPassword.trim()) {
        updateData.password = editAdminPassword;
      }

      const res = await fetch(`/api/admin/admins/${adminId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      const data = await safeJsonParse(res);

      if (!res.ok) {
        throw new Error(data.error || "فشل تحديث المسؤول");
      }

      setSuccess("تم تحديث المسؤول بنجاح");
      setEditingAdmin(null);
      setEditAdminUsername("");
      setEditAdminPassword("");
      setEditAdminIsHead(false);
      setEditAdminCanUpload(true);
      setEditAdminCanManageDatasets(true);
      setEditAdminCanManageSettings(false);
      loadAdmins();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحديث المسؤول");
    }
  };

  const handleDeleteAdmin = async (adminId: string, username: string) => {
    if (!confirm(`هل أنت متأكد من حذف المسؤول "${username}"؟`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/admins/${adminId}`, {
        method: "DELETE",
      });

      const data = await safeJsonParse(res);

      if (!res.ok) {
        throw new Error(data.error || "فشل حذف المسؤول");
      }

      setSuccess(`تم حذف المسؤول "${username}" بنجاح`);
      loadAdmins();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل حذف المسؤول");
    }
  };

  const startEditAdmin = (admin: any) => {
    setEditingAdmin(admin.id);
    setEditAdminUsername(admin.username);
    setEditAdminPassword("");
    setEditAdminIsHead(admin.isHeadAdmin ?? false);
    setEditAdminCanUpload(admin.canUpload ?? true);
    setEditAdminCanManageDatasets(admin.canManageDatasets ?? true);
    setEditAdminCanManageSettings(admin.canManageSettings ?? false);
  };

  const loadSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await safeJsonParse(res);
        setStudentSearchActive(data.studentSearchActive ?? true);
        setLecturerSearchActive(data.lecturerSearchActive ?? true);
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  };

  const updateSearchSettings = async (type: "student" | "lecturer", isActive: boolean) => {
    setLoadingSettings(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentSearchActive: type === "student" ? isActive : studentSearchActive,
          lecturerSearchActive: type === "lecturer" ? isActive : lecturerSearchActive,
        }),
      });

      if (!res.ok) {
        throw new Error("فشل تحديث الإعدادات");
      }

      const data = await safeJsonParse(res);
      setStudentSearchActive(data.studentSearchActive);
      setLecturerSearchActive(data.lecturerSearchActive);
      setSuccess(`تم ${isActive ? "تفعيل" : "إلغاء تفعيل"} صفحة البحث ${type === "student" ? "للطلاب" : "للمحاضرين"} بنجاح`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحديث الإعدادات");
    } finally {
      setLoadingSettings(false);
    }
  };

  const loadDatasets = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/datasets");
      if (res.ok) {
        const data = await safeJsonParse(res);
        setDatasets(data.datasets || []);
      }
    } catch (err) {
      console.error("Failed to load datasets:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin");
  };

  const handleToggleSelection = (datasetId: string) => {
    setSelectedDatasets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(datasetId)) {
        newSet.delete(datasetId);
      } else {
        newSet.add(datasetId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedDatasets.size === datasets.length) {
      setSelectedDatasets(new Set());
    } else {
      setSelectedDatasets(new Set(datasets.map(d => d.id)));
    }
  };

  const handleBulkActivate = async () => {
    if (selectedDatasets.size === 0) {
      setError("يرجى اختيار مجموعة بيانات واحدة على الأقل");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled(
        Array.from(selectedDatasets).map(datasetId =>
          fetch("/api/admin/activate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ datasetId }),
          })
        )
      );

      const failed = results.filter(r => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok));
      if (failed.length > 0) {
        throw new Error(`فشل تفعيل ${failed.length} مجموعة بيانات`);
      }

      setSuccess(`تم تفعيل ${selectedDatasets.size} مجموعة بيانات بنجاح`);
      setSelectedDatasets(new Set());
      loadDatasets();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تفعيل مجموعات البيانات");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedDatasets.size === 0) {
      setError("يرجى اختيار مجموعة بيانات واحدة على الأقل");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled(
        Array.from(selectedDatasets).map(datasetId =>
          fetch("/api/admin/deactivate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ datasetId }),
          })
        )
      );

      const failed = results.filter(r => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok));
      if (failed.length > 0) {
        throw new Error(`فشل إلغاء تفعيل ${failed.length} مجموعة بيانات`);
      }

      setSuccess(`تم إلغاء تفعيل ${selectedDatasets.size} مجموعة بيانات بنجاح`);
      setSelectedDatasets(new Set());
      loadDatasets();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل إلغاء تفعيل مجموعات البيانات");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDatasets.size === 0) {
      setError("يرجى اختيار مجموعة بيانات واحدة على الأقل");
      return;
    }

    const selectedNames = datasets
      .filter(d => selectedDatasets.has(d.id))
      .map(d => d.name)
      .join(", ");

    if (!confirm(`هل أنت متأكد من حذف ${selectedDatasets.size} مجموعة بيانات؟\n\n${selectedNames}\n\nلا يمكن التراجع عن هذا الإجراء وسيتم حذف جميع الامتحانات والتسجيلات المرتبطة.`)) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled(
        Array.from(selectedDatasets).map(datasetId =>
          fetch("/api/admin/delete-dataset", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ datasetId }),
          })
        )
      );

      const failed = results.filter(r => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok));
      if (failed.length > 0) {
        throw new Error(`فشل حذف ${failed.length} مجموعة بيانات`);
      }

      setSuccess(`تم حذف ${selectedDatasets.size} مجموعة بيانات بنجاح`);
      // Remove from expanded state if any were expanded
      setExpandedDataset(null);
      setDatasetDetails({});
      setSelectedDatasets(new Set());
      loadDatasets();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل حذف مجموعات البيانات");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (datasetId: string, datasetName: string) => {
    if (!confirm(`هل أنت متأكد من حذف مجموعة البيانات "${datasetName}"؟ لا يمكن التراجع عن هذا الإجراء وسيتم حذف جميع الامتحانات والتسجيلات المرتبطة.`)) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/delete-dataset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasetId }),
      });

      if (!res.ok) {
        const data = await safeJsonParse(res);
        throw new Error(data.error || "فشل حذف مجموعة البيانات");
      }

      setSuccess("تم حذف مجموعة البيانات بنجاح");
      // Remove from expanded state if it was expanded
      if (expandedDataset === datasetId) {
        setExpandedDataset(null);
        setDatasetDetails((prev) => {
          const newDetails = { ...prev };
          delete newDetails[datasetId];
          return newDetails;
        });
      }
      loadDatasets();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل حذف مجموعة البيانات");
    } finally {
      setLoading(false);
    }
  };

  const loadDatasetDetails = async (datasetId: string) => {
    if (datasetDetails[datasetId]) {
      // Already loaded, just toggle
      setExpandedDataset(expandedDataset === datasetId ? null : datasetId);
      return;
    }

    setLoadingDetails(datasetId);
    try {
      const res = await fetch(`/api/admin/dataset-details?datasetId=${datasetId}`);
      if (res.ok) {
        const data = await safeJsonParse(res);
        setDatasetDetails((prev) => ({ ...prev, [datasetId]: data }));
        setExpandedDataset(datasetId);
      } else {
        throw new Error("فشل تحميل تفاصيل مجموعة البيانات");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل تفاصيل مجموعة البيانات");
    } finally {
      setLoadingDetails(null);
    }
  };

  const readHeaders = async (file: File, fileType: "exam" | "enroll" | "lecturer") => {
    setReadingHeaders(true);
    try {
      // For enrollment files, check if it's block-structured first
      if (fileType === "enroll") {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("fileType", "enroll");
        
        // Check structure
        const structureRes = await fetch("/api/admin/check-structure", {
          method: "POST",
          body: formData,
        });
        
        if (structureRes.ok) {
          const structureData = await safeJsonParse(structureRes);
          if (structureData.isBlockStructure) {
            // Block-structured file - no header mapping needed
            setShowMapping(false);
            setError(null);
            setSuccess(`Block-structured file detected! The system will automatically extract:
- Student IDs and names
- Course codes
- Class/Section numbers (الشعبة) from column 13
No header mapping needed.`);
            return;
          } else if (structureData.isSectionStructure) {
            // Section-structured file - no header mapping needed
            setShowMapping(false);
            setError(null);
            setSuccess(`Course-section structured file detected! The system will automatically extract:
- Student IDs
- Course codes (from "المقرر:" rows)
- Section numbers (from "الشعبة:" rows)
No header mapping needed.`);
            return;
          }
        }
      }
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileType", fileType);

      const res = await fetch("/api/admin/read-headers", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await safeJsonParse(res);
        throw new Error(typeof errorData === 'string' ? errorData : errorData.error || "فشل قراءة العناوين");
      }

      const data = await safeJsonParse(res);
      
      if (fileType === "exam") {
        setExamHeaders(data.headers);
        // Auto-map headers (try to match)
        const autoMapping: HeaderMapping = {};
        data.requiredFields.forEach((field: string) => {
          const normalizedField = field.toLowerCase().replace(/_/g, "");
          const matched = data.headers.find((h: string) => {
            const normalized = h.toLowerCase().replace(/\s+/g, "").replace(/_/g, "");
            return normalized.includes(normalizedField) || normalizedField.includes(normalized);
          });
          if (matched) {
            autoMapping[field] = matched;
          }
        });
        setExamMapping(autoMapping);
      } else if (fileType === "lecturer") {
        setLecturerHeaders(data.headers);
        const autoMapping: HeaderMapping = {};
        data.requiredFields.forEach((field: string) => {
          const normalizedField = field.toLowerCase().replace(/_/g, "");
          const matched = data.headers.find((h: string) => {
            const normalized = h.toLowerCase().replace(/\s+/g, "").replace(/_/g, "");
            return normalized.includes(normalizedField) || normalizedField.includes(normalized);
          });
          if (matched) {
            autoMapping[field] = matched;
          }
        });
        setLecturerMapping(autoMapping);
      } else {
        setEnrollHeaders(data.headers);
        const autoMapping: HeaderMapping = {};
        data.requiredFields.forEach((field: string) => {
          const normalizedField = field.toLowerCase().replace(/_/g, "");
          const matched = data.headers.find((h: string) => {
            const normalized = h.toLowerCase().replace(/\s+/g, "").replace(/_/g, "");
            return normalized.includes(normalizedField) || normalizedField.includes(normalized);
          });
          if (matched) {
            autoMapping[field] = matched;
          }
        });
        setEnrollMapping(autoMapping);
      }
      
      setShowMapping(true);
    } catch (err) {
      console.error("Error reading headers:", err);
      setError("فشل قراءة عناوين Excel");
    } finally {
      setReadingHeaders(false);
    }
  };

  const handleExamFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setExamFiles(files);
    if (files.length > 0) {
      setReadingHeaders(true);
      // Check auto-detection for the first file
      const firstFile = files[0];
      try {
        const checkFormData = new FormData();
        checkFormData.append("file", firstFile);
        const checkRes = await fetch("/api/admin/check-exam-auto-detect", {
          method: "POST",
          body: checkFormData,
        });
        
        if (checkRes.ok) {
          const checkData = await safeJsonParse(checkRes);
          if (checkData.canAutoDetect) {
            // Auto-detection will work, set mapping and don't show UI
            setExamMapping(checkData.mapping);
            setExamAutoDetectSuccess(true);
            setShowMapping(false);
            return;
          } else {
            // Auto-detection failed, show mapping UI
            setExamAutoDetectSuccess(false);
            readHeaders(firstFile, "exam");
          }
        } else {
          // If check fails, fall back to showing mapping UI
          setExamAutoDetectSuccess(false);
          readHeaders(firstFile, "exam");
        }
      } catch (err) {
        // If check fails, fall back to showing mapping UI
        setExamAutoDetectSuccess(false);
        await readHeaders(firstFile, "exam");
      } finally {
        setReadingHeaders(false);
      }
    }
  };

  const handleEnrollFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setEnrollFiles(files);
    if (files.length > 0) {
      setReadingHeaders(true);
      try {
        // Read headers from the first file
        await readHeaders(files[0], "enroll");
      } finally {
        setReadingHeaders(false);
      }
    }
  };

  const handleLecturerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setLecturerFiles(files);
    if (files.length > 0) {
      setReadingHeaders(true);
      try {
        // Read headers from the first file
        await readHeaders(files[0], "lecturer");
      } finally {
        setReadingHeaders(false);
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadType) {
      setError("يرجى اختيار نوع الرفع (طالب أو محاضر)");
      return;
    }
    
    // File size validation (10MB per file limit for serverless timeout)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const MAX_TOTAL_SIZE = 20 * 1024 * 1024; // 20MB total
    
    if (uploadType === "student") {
      if (examFiles.length === 0 || enrollFiles.length === 0 || !datasetName.trim()) {
        setError("يرجى توفير ملف امتحان واحد على الأقل وملف تسجيل واحد واسم مجموعة البيانات");
        return;
      }
      
      // Check file sizes
      let totalSize = 0;
      for (const file of examFiles) {
        if (file.size > MAX_FILE_SIZE) {
          setError(`الملف "${file.name}" كبير جداً (${(file.size / 1024 / 1024).toFixed(2)} ميجابايت). الحد الأقصى لحجم الملف هو 10 ميجابايت. يرجى تقسيم الملف إلى أجزاء أصغر.`);
          return;
        }
        totalSize += file.size;
      }
      for (const file of enrollFiles) {
        if (file.size > MAX_FILE_SIZE) {
          setError(`الملف "${file.name}" كبير جداً (${(file.size / 1024 / 1024).toFixed(2)} ميجابايت). الحد الأقصى لحجم الملف هو 10 ميجابايت. يرجى تقسيم الملف إلى أجزاء أصغر.`);
          return;
        }
        totalSize += file.size;
      }
      if (totalSize > MAX_TOTAL_SIZE) {
        setError(`إجمالي حجم الملفات (${(totalSize / 1024 / 1024).toFixed(2)} ميجابايت) يتجاوز الحد الأقصى البالغ 20 ميجابايت. يرجى رفع ملفات أقل أو أصغر.`);
        return;
      }
    } else if (uploadType === "lecturer") {
      if (lecturerFiles.length === 0 || !datasetName.trim()) {
        setError("يرجى توفير ملف محاضر واحد على الأقل واسم مجموعة البيانات");
        return;
      }
      
      // Check file sizes
      let totalSize = 0;
      for (const file of lecturerFiles) {
        if (file.size > MAX_FILE_SIZE) {
          setError(`الملف "${file.name}" كبير جداً (${(file.size / 1024 / 1024).toFixed(2)} ميجابايت). الحد الأقصى لحجم الملف هو 10 ميجابايت. يرجى تقسيم الملف إلى أجزاء أصغر.`);
          return;
        }
        totalSize += file.size;
      }
      if (totalSize > MAX_TOTAL_SIZE) {
        setError(`إجمالي حجم الملفات (${(totalSize / 1024 / 1024).toFixed(2)} ميجابايت) يتجاوز الحد الأقصى البالغ 20 ميجابايت. يرجى رفع ملفات أقل أو أصغر.`);
        return;
      }
    }

    // Check if enrollment files are block-structured or section-structured (only for student upload)
    let isBlockStructured = false;
    let isSectionStructured = false;
    if (uploadType === "student" && enrollFiles.length > 0) {
      try {
        const checkFormData = new FormData();
        checkFormData.append("file", enrollFiles[0]); // Check first file
        checkFormData.append("fileType", "enroll");
        const structureRes = await fetch("/api/admin/check-structure", {
          method: "POST",
          body: checkFormData,
        });
        if (structureRes.ok) {
          const structureData = await safeJsonParse(structureRes);
          isBlockStructured = structureData.isBlockStructure;
          isSectionStructured = structureData.isSectionStructure || false;
        }
      } catch (err) {
        // Continue with validation if check fails
      }
    }
    
    // Validate mappings based on upload type
    if (uploadType === "student") {
      const examRequired = ["course_code", "course_name", "class_no", "exam_date", "start_time", "place", "period"];
      const enrollRequired = (isBlockStructured || isSectionStructured) ? [] : ["student_id", "course_code", "class_no"];
      
      const missingExam = examRequired.filter(f => !examMapping[f]);
      const missingEnroll = enrollRequired.filter(f => !enrollMapping[f]);
      
      if (missingExam.length > 0 || missingEnroll.length > 0) {
        setError(`يرجى تعيين جميع الحقول المطلوبة. الحقول المفقودة: ${[...missingExam, ...missingEnroll].join(", ")}`);
        return;
      }
    } else if (uploadType === "lecturer") {
      const lecturerRequired = ["lecturer_name", "section", "course_code", "course_name", "room", "exam_date", "exam_period", "period_start"];
      const missingLecturer = lecturerRequired.filter(f => !lecturerMapping[f]);
      
      if (missingLecturer.length > 0) {
        setError(`يرجى تعيين جميع الحقول المطلوبة. الحقول المفقودة: ${missingLecturer.join(", ")}`);
        return;
      }
    }

    setUploading(true);
    setUploadProgress(0);
    setShowUploadModal(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append("uploadType", uploadType);
      formData.append("datasetName", datasetName.trim());
      
      if (uploadType === "student") {
        // Append all exam files
        examFiles.forEach((file) => {
          formData.append("examFiles", file);
        });
        // Append all enrollment files
        enrollFiles.forEach((file) => {
          formData.append("enrollFiles", file);
        });
        formData.append("examMapping", JSON.stringify(examMapping));
        // Only send enrollment mapping if not block-structured
        if (!isBlockStructured && !isSectionStructured) {
          formData.append("enrollMapping", JSON.stringify(enrollMapping));
        }
      } else if (uploadType === "lecturer") {
        // Append all lecturer files
        lecturerFiles.forEach((file) => {
          formData.append("lecturerFiles", file);
        });
        // Send lecturer mapping if headers are available
        if (lecturerHeaders.length > 0) {
          formData.append("lecturerMapping", JSON.stringify(lecturerMapping));
        }
      }

      // Use XMLHttpRequest for progress tracking
      const res = await new Promise<Response>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        // Track upload progress
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(percentComplete);
          }
        });
        
        // Handle completion
        xhr.addEventListener('load', () => {
          // Create a Response-like object
          const response = new Response(xhr.responseText, {
            status: xhr.status,
            statusText: xhr.statusText,
            headers: new Headers({
              'content-type': xhr.getResponseHeader('content-type') || 'application/json',
            }),
          });
          resolve(response);
        });
        
        // Handle errors
        xhr.addEventListener('error', () => {
          reject(new Error('Network error'));
        });
        
        xhr.addEventListener('abort', () => {
          reject(new Error('Upload aborted'));
        });
        
        // Open and send request
        xhr.open('POST', '/api/admin/upload');
        xhr.send(formData);
      });

      const data = await safeJsonParse(res);

      if (!res.ok) {
        // Handle timeout errors (504 Gateway Timeout)
        if (res.status === 504 || res.status === 408) {
          const timeoutError = typeof data === 'string' ? data : 'Upload timeout';
          setError(`انتهت مهلة الرفع: الملف كبير جداً أو استغرق المعالجة وقتاً طويلاً. يرجى المحاولة:\n1. تقسيم الملفات الكبيرة إلى ملفات أصغر\n2. تقليل عدد الصفوف\n3. التحقق من اتصال الإنترنت\n\nخطأ: ${timeoutError}`);
          setLoading(false);
          return;
        }
        
        // Handle non-JSON error responses
        if (typeof data === 'string') {
          // Check if it's a timeout-related error message
          if (data.includes('timeout') || data.includes('TIMEOUT') || data.includes('FUNCTION_INVOCATION_TIMEOUT')) {
            setError(`انتهت مهلة الرفع: استغرق معالجة الملف وقتاً طويلاً. يرجى المحاولة:\n1. تقسيم الملفات الكبيرة إلى ملفات أصغر\n2. تقليل عدد الصفوف\n3. الاتصال بالدعم إذا استمرت المشكلة\n\nخطأ: ${data.substring(0, 200)}`);
          } else {
            setError(data);
          }
          setUploadProgress(0);
          setUploading(false);
          return;
        }
        
        if (data && (data.examErrors || data.enrollErrors || data.lecturerErrors)) {
          const examErrCount = data.totalExamErrors || data.examErrors?.length || 0;
          const enrollErrCount = data.totalEnrollErrors || data.enrollErrors?.length || 0;
          const lecturerErrCount = data.totalLecturerErrors || data.lecturerErrors?.length || 0;
          
          let errorMsg = `فشل التحقق: ${examErrCount} أخطاء في الامتحانات، ${enrollErrCount} أخطاء في التسجيلات`;
          if (lecturerErrCount > 0) {
            errorMsg += `, ${lecturerErrCount} lecturer errors`;
          }
          errorMsg += `.`;
          
          if (data.suggestion) {
            errorMsg += `\n\n${data.suggestion}`;
          }
          
          // Show error summary for lecturer errors
          if (data.errorSummary && uploadType === "lecturer") {
            const commonErrors = Object.entries(data.errorSummary)
              .sort((a: any, b: any) => b[1] - a[1])
              .slice(0, 5)
              .map(([type, count]) => `  - ${type}: ${count} errors`)
              .join('\n');
            if (commonErrors) {
              errorMsg += `\n\nMost common errors:\n${commonErrors}`;
            }
          }
          
          // Show sample errors for lecturer
          if (data.lecturerErrors && data.lecturerErrors.length > 0 && uploadType === "lecturer") {
            errorMsg += `\n\nSample errors (first 5):\n`;
            data.lecturerErrors.slice(0, 5).forEach((err: any) => {
              errorMsg += `  Row ${err.row}: ${err.field || 'unknown'} - ${err.message}\n`;
            });
          }
          
          if (data.examErrorSummary) {
            const commonErrors = Object.entries(data.examErrorSummary)
              .sort((a: any, b: any) => b[1] - a[1])
              .slice(0, 3)
              .map(([type, count]) => `  - ${type}: ${count} errors`)
              .join('\n');
            if (commonErrors) {
              errorMsg += `\n\nMost common exam errors:\n${commonErrors}`;
            }
          }
          
          throw new Error(errorMsg);
        }
        // Handle error response (could be string or object)
        const errorMessage = typeof data === 'string' ? data : (data?.error || "Upload failed");
        throw new Error(errorMessage);
      }

      const inserted = data.summary?.inserted || 0;
      const updated = data.summary?.updated || 0;
      const failed = data.summary?.failed || 0;
      const uniqueStudents = data.summary?.details?.enrollments?.uniqueStudents || 0;
      const fileType = data.fileType === "block-structured" ? " (تم اكتشاف ملفات منظمة على شكل كتل)" : 
                       data.fileType === "section-structured" ? " (تم اكتشاف ملفات منظمة على شكل أقسام)" : "";
      const filesProcessed = data.filesProcessed || {};
      
      let successMsg = `تم الرفع بنجاح! تمت معالجة ${filesProcessed.examFiles || 0} ملف امتحان و ${filesProcessed.enrollFiles || 0} ملف تسجيل`;
      if (filesProcessed.lecturerFiles > 0) {
        successMsg += ` و ${filesProcessed.lecturerFiles} ملف محاضر`;
      }
      successMsg += `. تم الإدراج: ${inserted}، تم التحديث: ${updated}، فشل: ${failed}`;
      if (uniqueStudents > 0) {
        successMsg += ` | الطلاب: ${uniqueStudents}`;
      }
      if (fileType) {
        successMsg += fileType;
      }
      setSuccess(successMsg);
      setDatasetName("");
      setExamFiles([]);
      setEnrollFiles([]);
      setLecturerFiles([]);
      setExamHeaders([]);
      setEnrollHeaders([]);
      setLecturerHeaders([]);
      setExamMapping({});
      setEnrollMapping({});
      setLecturerMapping({});
      setShowMapping(false);
      const examInput = document.getElementById("examFile") as HTMLInputElement;
      const enrollInput = document.getElementById("enrollFile") as HTMLInputElement;
      if (examInput) examInput.value = "";
      if (enrollInput) enrollInput.value = "";
      loadDatasets();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل الرفع");
      setUploadProgress(0);
      setShowUploadModal(false);
    } finally {
      setUploading(false);
      // Close modal after showing completion
      if (uploadProgress === 100) {
        setTimeout(() => {
          setUploadProgress(0);
          setShowUploadModal(false);
        }, 1500);
      } else {
        setTimeout(() => {
          setShowUploadModal(false);
          setUploadProgress(0);
        }, 500);
      }
    }
  };

  const isProcessing = uploading || readingHeaders;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 relative">
      {/* Loading Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-gray-700 font-medium">
              {uploading ? "Uploading files..." : "Reading file headers..."}
            </p>
            <p className="text-sm text-gray-500">Please wait, do not close this page</p>
          </div>
        </div>
      )}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Image 
              src="/img/Qassim_University_logo.png" 
              alt="Qassim University Logo" 
              width={200}
              height={48}
              className="h-12 w-auto"
            />
            <h1 className="text-3xl font-bold text-gray-900">لوحة التحكم</h1>
          </div>
          <div className="flex items-center gap-3">
            {currentAdmin?.isHeadAdmin && (
              <button
                onClick={() => {
                  setShowAdminManagement(true);
                  loadAdmins();
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center gap-2"
              >
                <Shield className="w-4 h-4" />
                إدارة المسؤولين
              </button>
            )}
            {(currentAdmin?.isHeadAdmin || currentAdmin?.canManageSettings) && (
              <button
                onClick={() => setShowSettingsModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                إعدادات صفحات البحث
              </button>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              تسجيل الخروج
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-4">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Form */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5" />
              رفع مجموعة بيانات جديدة
            </h2>

            <form onSubmit={handleUpload} className="space-y-4">
              {/* Upload Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ماذا تريد رفعه؟
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setUploadType("student");
                      setExamFiles([]);
                      setEnrollFiles([]);
                      setLecturerFiles([]);
                      setExamHeaders([]);
                      setEnrollHeaders([]);
                      setLecturerHeaders([]);
                      setExamMapping({});
                      setEnrollMapping({});
                      setLecturerMapping({});
                      setShowMapping(false);
                      setExamAutoDetectSuccess(false);
                    }}
                    className={`px-4 py-3 border-2 rounded-md transition-all ${
                      uploadType === "student"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-300 bg-white text-gray-700 hover:border-blue-300"
                    }`}
                    disabled={uploading || readingHeaders}
                  >
                    <div className="flex items-center gap-2 justify-center">
                      <Users className="w-5 h-5" />
                      <span className="font-medium">بيانات الطلاب</span>
                    </div>
                    <p className="text-xs mt-1 text-gray-600">جداول الامتحانات والتسجيلات</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadType("lecturer");
                      setExamFiles([]);
                      setEnrollFiles([]);
                      setLecturerFiles([]);
                      setExamHeaders([]);
                      setEnrollHeaders([]);
                      setLecturerHeaders([]);
                      setExamMapping({});
                      setEnrollMapping({});
                      setLecturerMapping({});
                      setShowMapping(false);
                      setExamAutoDetectSuccess(false);
                    }}
                    className={`px-4 py-3 border-2 rounded-md transition-all ${
                      uploadType === "lecturer"
                        ? "border-purple-500 bg-purple-50 text-purple-700"
                        : "border-gray-300 bg-white text-gray-700 hover:border-purple-300"
                    }`}
                    disabled={uploading || readingHeaders}
                  >
                    <div className="flex items-center gap-2 justify-center">
                      <User className="w-5 h-5" />
                      <span className="font-medium">بيانات المحاضرين</span>
                    </div>
                    <p className="text-xs mt-1 text-gray-600">جداول امتحانات المحاضرين</p>
                  </button>
                </div>
              </div>

              {uploadType && (
                <>
                  <div>
                    <label htmlFor="datasetName" className="block text-sm font-medium text-gray-700 mb-2">
                      اسم مجموعة البيانات (مثال: &quot;الفصل الأول 2025&quot;)
                    </label>
                    <input
                      id="datasetName"
                      disabled={uploading || readingHeaders}
                      type="text"
                      value={datasetName}
                      onChange={(e) => setDatasetName(e.target.value)}
                      required
                      placeholder="الفصل الأول 2025"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Student Upload Fields */}
                  {uploadType === "student" && (
                    <>
                      <div>
                        <label htmlFor="examFile" className="block text-sm font-medium text-gray-700 mb-2">
                          ملفات جدول الامتحانات (Excel) - يُسمح بملفات متعددة
                        </label>
                        <input
                          id="examFile"
                          type="file"
                          accept=".xlsx,.xls"
                          multiple
                          onChange={handleExamFileChange}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          disabled={uploading || readingHeaders}
                        />
                        {examFiles.length > 0 && (
                          <div className="mt-2 text-sm text-gray-600">
                            <span className="font-medium">تم اختيار {examFiles.length} ملف:</span>
                            <ul className="list-disc list-inside mt-1">
                              {examFiles.map((file, idx) => (
                                <li key={idx}>{file.name}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      <div>
                        <label htmlFor="enrollFile" className="block text-sm font-medium text-gray-700 mb-2">
                          ملفات تسجيلات الطلاب (Excel) - يُسمح بملفات متعددة
                        </label>
                        <input
                          id="enrollFile"
                          type="file"
                          accept=".xlsx,.xls"
                          multiple
                          onChange={handleEnrollFileChange}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          disabled={uploading || readingHeaders}
                        />
                        {enrollFiles.length > 0 && (
                          <div className="mt-2 text-sm text-gray-600">
                            <span className="font-medium">تم اختيار {enrollFiles.length} ملف:</span>
                            <ul className="list-disc list-inside mt-1">
                              {enrollFiles.map((file, idx) => (
                                <li key={idx}>{file.name}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Auto-detection success message for exam file */}
                      {examAutoDetectSuccess && examFiles.length > 0 && (
                        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">
                              ملف جدول الامتحانات: تم اكتشاف جميع العناوين تلقائياً بنجاح! لا حاجة للتعيين اليدوي.
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setExamAutoDetectSuccess(false);
                              if (examFiles.length > 0) {
                                readHeaders(examFiles[0], "exam");
                              }
                            }}
                            className="mt-2 text-xs text-green-700 hover:text-green-900 underline"
                          >
                            اضغط لتعديل العناوين يدوياً
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {/* Lecturer Upload Fields */}
                  {uploadType === "lecturer" && (
                    <div>
                      <label htmlFor="lecturerFile" className="block text-sm font-medium text-gray-700 mb-2">
                        ملفات جدول المحاضرين (Excel) - يُسمح بملفات متعددة
                      </label>
                      <input
                        id="lecturerFile"
                        type="file"
                        accept=".xlsx,.xls"
                        multiple
                        onChange={handleLecturerFileChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        disabled={uploading || readingHeaders}
                      />
                      {lecturerFiles.length > 0 && (
                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">تم اختيار {lecturerFiles.length} ملف:</span>
                          <ul className="list-disc list-inside mt-1">
                            {lecturerFiles.map((file, idx) => (
                              <li key={idx}>{file.name}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Header Mapping Section */}
              {showMapping && (examHeaders.length > 0 || enrollHeaders.length > 0 || lecturerHeaders.length > 0) && (
                <div className="border-t pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Settings className="w-4 h-4" />
                      ربط عناوين Excel بالحقول
                    </div>
                    <span className="text-xs text-gray-500 italic">
                      ✓ تم الاكتشاف تلقائياً • يمكنك التعديل أدناه
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 bg-yellow-50 border border-yellow-200 rounded p-2">
                    <strong>ملاحظة:</strong> تم اكتشاف العناوين تلقائياً. يمكنك تغيير أي ربط عن طريق اختيار عنوان مختلف من القوائم المنسدلة أدناه.
                  </p>

                  {/* Exam Schedule Mapping */}
                  {examHeaders.length > 0 && (
                    <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-900">ملف جدول الامتحانات</h4>
                        <button
                          type="button"
                          onClick={() => {
                            // Re-run auto-detection for exam file
                            if (examFiles.length > 0) {
                              readHeaders(examFiles[0], "exam");
                            }
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 underline disabled:opacity-50 disabled:cursor-not-allowed"
                          title="إعادة تعيين إلى القيم المكتشفة تلقائياً"
                          disabled={uploading || readingHeaders}
                        >
                          إعادة الكشف التلقائي
                        </button>
                      </div>
                      <div className="space-y-2">
                        {["course_code", "course_name", "class_no", "exam_date", "start_time", "place", "period"].map((field) => (
                          <div key={field} className="flex items-center gap-2">
                            <label className="text-xs text-gray-600 w-28 capitalize">
                              {field.replace(/_/g, " ")}:
                            </label>
                            <select
                              value={examMapping[field] || ""}
                              onChange={(e) => setExamMapping({ ...examMapping, [field]: e.target.value })}
                              className="flex-1 text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white hover:border-blue-400 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                              required
                              disabled={uploading || readingHeaders}
                            >
                              <option value="">اختر العنوان...</option>
                              {examHeaders.map((header) => (
                                <option key={header} value={header}>
                                  {header}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                        {/* end_time is optional */}
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-600 w-28 capitalize">
                            وقت الانتهاء (اختياري):
                          </label>
                          <select
                            value={examMapping["end_time"] || ""}
                            onChange={(e) => setExamMapping({ ...examMapping, end_time: e.target.value })}
                            className="flex-1 text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white hover:border-blue-400 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                            disabled={uploading || readingHeaders}
                          >
                            <option value="">اختر العنوان (اختياري)...</option>
                            {examHeaders.map((header) => (
                              <option key={header} value={header}>
                                {header}
                              </option>
                            ))}
                          </select>
                        </div>
                        {["rows", "seats"].map((field) => (
                          <div key={field} className="flex items-center gap-2">
                            <label className="text-xs text-gray-600 w-28 capitalize">
                              {field === "rows" ? "الصفوف" : "المقاعد"} (اختياري):
                            </label>
                            <select
                              value={examMapping[field] || ""}
                              onChange={(e) => setExamMapping({ ...examMapping, [field]: e.target.value })}
                              className="flex-1 text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white hover:border-blue-400 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                              disabled={uploading || readingHeaders}
                            >
                              <option value="">اختر العنوان (اختياري)...</option>
                              {examHeaders.map((header) => (
                                <option key={header} value={header}>
                                  {header}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Lecturer Mapping */}
                  {lecturerHeaders.length > 0 && (
                    <div className="bg-purple-50 p-3 rounded-md border border-purple-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-900">ملف جدول المحاضرين</h4>
                        <button
                          type="button"
                          onClick={() => {
                            if (lecturerFiles.length > 0) {
                              readHeaders(lecturerFiles[0], "lecturer");
                            }
                          }}
                          className="text-xs text-purple-600 hover:text-purple-800 underline disabled:opacity-50 disabled:cursor-not-allowed"
                          title="إعادة تعيين إلى القيم المكتشفة تلقائياً"
                          disabled={uploading || readingHeaders}
                        >
                          إعادة الكشف التلقائي
                        </button>
                      </div>
                      <div className="space-y-2">
                        {["lecturer_name", "section", "course_code", "course_name", "room", "exam_date", "exam_period", "period_start"].map((field) => (
                          <div key={field} className="flex items-center gap-2">
                            <label className="text-xs text-gray-600 w-28 capitalize">
                              {field.replace(/_/g, " ")}:
                            </label>
                            <select
                              value={lecturerMapping[field] || ""}
                              onChange={(e) => setLecturerMapping({ ...lecturerMapping, [field]: e.target.value })}
                              className="flex-1 text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white hover:border-purple-400 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                              required
                              disabled={uploading || readingHeaders}
                            >
                              <option value="">اختر العنوان...</option>
                              {lecturerHeaders.map((header) => (
                                <option key={header} value={header}>
                                  {header}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                        {["role", "grade", "exam_code", "number_of_students", "column", "day", "invigilator"].map((field) => (
                          <div key={field} className="flex items-center gap-2">
                            <label className="text-xs text-gray-600 w-28 capitalize">
                              {field.replace(/_/g, " ")} (اختياري):
                            </label>
                            <select
                              value={lecturerMapping[field] || ""}
                              onChange={(e) => setLecturerMapping({ ...lecturerMapping, [field]: e.target.value })}
                              className="flex-1 text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white hover:border-purple-400 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                              disabled={uploading || readingHeaders}
                            >
                              <option value="">اختر العنوان (اختياري)...</option>
                              {lecturerHeaders.map((header) => (
                                <option key={header} value={header}>
                                  {header}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Enrollment Mapping */}
                  {enrollHeaders.length > 0 && (
                    <div className="bg-green-50 p-3 rounded-md border border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-900">ملف التسجيلات</h4>
                        <button
                          type="button"
                          onClick={() => {
                            // Re-run auto-detection for enrollment file
                            if (enrollFiles.length > 0) {
                              readHeaders(enrollFiles[0], "enroll");
                            }
                          }}
                          className="text-xs text-green-600 hover:text-green-800 underline disabled:opacity-50 disabled:cursor-not-allowed"
                          title="إعادة تعيين إلى القيم المكتشفة تلقائياً"
                          disabled={uploading || readingHeaders}
                        >
                          إعادة الكشف التلقائي
                        </button>
                      </div>
                      <div className="space-y-2">
                        {["student_id", "course_code", "class_no"].map((field) => (
                          <div key={field} className="flex items-center gap-2">
                            <label className="text-xs text-gray-600 w-28 capitalize">
                              {field.replace(/_/g, " ")}:
                            </label>
                            <select
                              value={enrollMapping[field] || ""}
                              onChange={(e) => setEnrollMapping({ ...enrollMapping, [field]: e.target.value })}
                              className="flex-1 text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 bg-white hover:border-green-400 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                              required
                              disabled={uploading || readingHeaders}
                            >
                              <option value="">اختر العنوان...</option>
                              {enrollHeaders.map((header) => (
                                <option key={header} value={header}>
                                  {header}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}


              <button
                type="submit"
                disabled={uploading || readingHeaders}
                className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload Dataset
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Dataset List */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                مجموعات البيانات
              </h2>
              <div className="flex items-center gap-2">
                {datasets.length > 0 && (
                  <>
                    <button
                      onClick={handleSelectAll}
                      className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded-md flex items-center gap-1"
                      title="تحديد جميع مجموعات البيانات"
                    >
                      {selectedDatasets.size === datasets.length ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                      {selectedDatasets.size === datasets.length ? "إلغاء تحديد الكل" : "تحديد الكل"}
                    </button>
                    {selectedDatasets.size > 0 && (
                      <>
                        <button
                          onClick={handleBulkActivate}
                          disabled={loading}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                          تفعيل المحدد ({selectedDatasets.size})
                        </button>
                        <button
                          onClick={handleBulkDeactivate}
                          disabled={loading}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50"
                        >
                          إلغاء تفعيل المحدد ({selectedDatasets.size})
                        </button>
                        <button
                          onClick={handleBulkDelete}
                          disabled={loading}
                          className="px-3 py-1 bg-red-800 text-white text-sm rounded-md hover:bg-red-900 disabled:opacity-50 flex items-center gap-1"
                        >
                          <Trash2 className="w-4 h-4" />
                          حذف المحدد ({selectedDatasets.size})
                        </button>
                      </>
                )}
                  </>
                )}
                <button
                  onClick={loadDatasets}
                  disabled={loading}
                  className="p-2 text-gray-600 hover:text-gray-900"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
              </div>
            ) : datasets.length === 0 ? (
              <p className="text-gray-500 text-center py-8">لا توجد مجموعات بيانات بعد</p>
            ) : (
              <div className="space-y-2">
                {datasets.map((dataset) => {
                  const isExpanded = expandedDataset === dataset.id;
                  const details = datasetDetails[dataset.id];
                  const isLoadingDetails = loadingDetails === dataset.id;

                  return (
                    <div
                      key={dataset.id}
                      className={`border rounded-md ${
                        dataset.isActive ? "border-green-500 bg-green-50" : "border-gray-200 bg-white"
                      }`}
                    >
                      <div className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3 flex-1">
                            <input
                              type="checkbox"
                              checked={selectedDatasets.has(dataset.id)}
                              onChange={() => handleToggleSelection(dataset.id)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium text-gray-900">{dataset.name}</h3>
                                {dataset.isActive && (
                                  <span className="inline-flex items-center gap-1 text-sm text-green-700">
                                    <CheckCircle className="w-4 h-4" />
                                    نشط
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-500 mt-1">
                                تم الإنشاء: {new Date(dataset.createdAt).toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => loadDatasetDetails(dataset.id)}
                              disabled={isLoadingDetails}
                              className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 disabled:opacity-50 flex items-center gap-1"
                              title="عرض تفاصيل مجموعة البيانات"
                            >
                              {isLoadingDetails ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Info className="w-4 h-4" />
                                  {isExpanded ? (
                                    <>
                                      <ChevronUp className="w-4 h-4" />
                                      إخفاء
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="w-4 h-4" />
                                      التفاصيل
                                    </>
                                  )}
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleDelete(dataset.id, dataset.name)}
                              disabled={loading}
                              className="px-3 py-1 bg-red-800 text-white text-sm rounded-md hover:bg-red-900 disabled:opacity-50 flex items-center gap-1"
                              title="حذف مجموعة البيانات"
                            >
                              <Trash2 className="w-4 h-4" />
                              حذف
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Dataset Details */}
                      {isExpanded && details && (
                        <div className="border-t bg-gray-50 p-4 space-y-4">
                          {/* Summary */}
                          <div className={`grid gap-4 ${details.dataset.type === "lecturer" ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2 md:grid-cols-4"}`}>
                            {details.dataset.type === "lecturer" ? (
                              <>
                                <div className="bg-white p-3 rounded-md border border-gray-200 text-center">
                                  <div className="text-2xl font-bold text-blue-600">{details.summary.totalLecturerExams}</div>
                                  <div className="text-sm text-gray-600 mt-1">إجمالي امتحانات المحاضرين</div>
                                </div>
                                <div className="bg-white p-3 rounded-md border border-gray-200 text-center">
                                  <div className="text-2xl font-bold text-purple-600">{details.summary.uniqueLecturers}</div>
                                  <div className="text-sm text-gray-600 mt-1">Unique Lecturers</div>
                                </div>
                                <div className="bg-white p-3 rounded-md border border-gray-200 text-center">
                                  <div className="text-2xl font-bold text-orange-600">{details.summary.uniqueCourses}</div>
                                  <div className="text-sm text-gray-600 mt-1">Unique Courses</div>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="bg-white p-3 rounded-md border border-gray-200 text-center">
                                  <div className="text-2xl font-bold text-blue-600">{details.summary.totalExams}</div>
                                  <div className="text-sm text-gray-600 mt-1">إجمالي الامتحانات</div>
                                </div>
                                <div className="bg-white p-3 rounded-md border border-gray-200 text-center">
                                  <div className="text-2xl font-bold text-green-600">{details.summary.totalEnrollments}</div>
                                  <div className="text-sm text-gray-600 mt-1">إجمالي التسجيلات</div>
                                </div>
                                <div className="bg-white p-3 rounded-md border border-gray-200 text-center">
                                  <div className="text-2xl font-bold text-purple-600">{details.summary.uniqueCourses}</div>
                                  <div className="text-sm text-gray-600 mt-1">Unique Courses</div>
                                </div>
                                <div className="bg-white p-3 rounded-md border border-gray-200 text-center">
                                  <div className="text-2xl font-bold text-orange-600">{details.summary.uniqueStudents}</div>
                                  <div className="text-sm text-gray-600 mt-1">الطلاب المميزون</div>
                                </div>
                              </>
                            )}
                          </div>

                          {/* All Exams / Lecturer Exams */}
                          {details.dataset.type === "lecturer" ? (
                            details.lecturerExams && details.lecturerExams.length > 0 && (
                              <div className="bg-white p-4 rounded-md border border-gray-200">
                                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                  <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                                  جميع امتحانات المحاضرين ({details.lecturerExams.length})
                                </h4>
                                <div className="max-h-96 overflow-y-auto">
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                      <thead className="bg-gray-100 sticky top-0">
                                        <tr>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Lecturer Name</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Role</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Grade</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Exam Code</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Course Code</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Course Name</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Section</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">الطلاب</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Room</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Column</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Day</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Date</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Period</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Time</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Invigilator</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-200">
                                        {details.lecturerExams.map((exam) => (
                                          <tr key={exam.id} className="hover:bg-gray-50">
                                            <td className="px-3 py-2 font-medium text-gray-900">{exam.lecturerName}</td>
                                            <td className="px-3 py-2 text-gray-600">{exam.role || "-"}</td>
                                            <td className="px-3 py-2 text-gray-600">{exam.grade || "-"}</td>
                                            <td className="px-3 py-2 text-gray-600">{exam.examCode || "-"}</td>
                                            <td className="px-3 py-2 text-gray-700">{exam.courseCode}</td>
                                            <td className="px-3 py-2 text-gray-700">{exam.courseName}</td>
                                            <td className="px-3 py-2 text-gray-600">{exam.section}</td>
                                            <td className="px-3 py-2 text-gray-600">{exam.numberOfStudents || "-"}</td>
                                            <td className="px-3 py-2 text-gray-600">{exam.room}</td>
                                            <td className="px-3 py-2 text-gray-600">{exam.column || "-"}</td>
                                            <td className="px-3 py-2 text-gray-600">{exam.day || "-"}</td>
                                            <td className="px-3 py-2 text-gray-600">{exam.examDate}</td>
                                            <td className="px-3 py-2 text-gray-600">{exam.examPeriod}</td>
                                            <td className="px-3 py-2 text-gray-600">{exam.periodStart}</td>
                                            <td className="px-3 py-2 text-gray-600">{exam.invigilator || "-"}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            )
                          ) : (
                            details.exams.length > 0 && (
                              <div className="bg-white p-4 rounded-md border border-gray-200">
                                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                  <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                                  جميع الامتحانات ({details.exams.length})
                                </h4>
                                <div className="max-h-96 overflow-y-auto">
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                      <thead className="bg-gray-100 sticky top-0">
                                        <tr>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Course Code</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Course Name</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Class</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Date</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Time</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Place</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Period</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Rows</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Seats</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-200">
                                        {details.exams.map((exam) => (
                                          <tr key={exam.id} className="hover:bg-gray-50">
                                            <td className="px-3 py-2 font-medium text-gray-900">{exam.courseCode}</td>
                                            <td className="px-3 py-2 text-gray-700">{exam.courseName}</td>
                                            <td className="px-3 py-2 text-gray-600">{exam.classNo}</td>
                                            <td className="px-3 py-2 text-gray-600">{exam.examDate}</td>
                                            <td className="px-3 py-2 text-gray-600">{exam.startTime} - {exam.endTime}</td>
                                            <td className="px-3 py-2 text-gray-600">{exam.place}</td>
                                            <td className="px-3 py-2 text-gray-600">{exam.period}</td>
                                            <td className="px-3 py-2 text-gray-600">{exam.rows ?? "-"}</td>
                                            <td className="px-3 py-2 text-gray-600">{exam.seats ?? "-"}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            )
                          )}

                          {/* All Enrollments - Only show for student datasets */}
                          {details.dataset.type !== "lecturer" && details.enrollments.length > 0 && (
                          <div className="bg-white p-4 rounded-md border border-gray-200">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <FileSpreadsheet className="w-4 h-4 text-green-600" />
                              جميع التسجيلات ({details.enrollments.length})
                            </h4>
                            <div className="max-h-96 overflow-y-auto">
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                  <thead className="bg-gray-100 sticky top-0">
                                    <tr>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Student ID</th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Course Code</th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Class/Section</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                    {details.enrollments.map((enroll) => (
                                      <tr key={enroll.id} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 font-medium text-gray-900">{enroll.studentId}</td>
                                        <td className="px-3 py-2 text-gray-700">{enroll.courseCode}</td>
                                        <td className="px-3 py-2 text-gray-600">{enroll.classNo}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Page Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                <Settings className="w-6 h-6" />
                Search Page Settings
              </h2>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="إغلاق"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Student Search */}
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div>
                  <h3 className="font-medium text-gray-900">Student Search Page</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Control access to the student exam schedule search page
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${studentSearchActive ? "text-green-600" : "text-gray-500"}`}>
                    {studentSearchActive ? "نشط" : "غير نشط"}
                  </span>
                  <button
                    onClick={() => updateSearchSettings("student", !studentSearchActive)}
                    disabled={loadingSettings}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      studentSearchActive
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "bg-green-600 text-white hover:bg-green-700"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {studentSearchActive ? "إلغاء التفعيل" : "تفعيل"}
                  </button>
                </div>
              </div>

              {/* Lecturer Search */}
              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div>
                  <h3 className="font-medium text-gray-900">Lecturer Search Page</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Control access to the lecturer exam schedule search page
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${lecturerSearchActive ? "text-green-600" : "text-gray-500"}`}>
                    {lecturerSearchActive ? "نشط" : "غير نشط"}
                  </span>
                  <button
                    onClick={() => updateSearchSettings("lecturer", !lecturerSearchActive)}
                    disabled={loadingSettings}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      lecturerSearchActive
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "bg-green-600 text-white hover:bg-green-700"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {lecturerSearchActive ? "إلغاء التفعيل" : "تفعيل"}
                  </button>
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Management Modal (Head Admin Only) */}
      {currentAdmin?.isHeadAdmin && showAdminManagement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                إدارة المسؤولين
              </h2>
              <button
                onClick={() => {
                  setShowAdminManagement(false);
                  setEditingAdmin(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => {
                    setShowCreateAdminModal(true);
                    setNewAdminUsername("");
                    setNewAdminPassword("");
                    setNewAdminIsHead(false);
                    setNewAdminCanUpload(true);
                    setNewAdminCanManageDatasets(true);
                    setNewAdminCanManageSettings(false);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  إضافة مسؤول جديد
                </button>
              </div>

              <div className="space-y-2">
            {admins.length === 0 ? (
              <p className="text-gray-500 text-center py-8">لا توجد حسابات مسؤولين</p>
            ) : (
              admins.map((admin) => (
                <div
                  key={admin.id}
                  className="border rounded-md p-4 flex justify-between items-center"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900">{admin.username}</span>
                        {admin.isHeadAdmin && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                            رئيس المسؤولين
                          </span>
                        )}
                        {admin.canUpload && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                            رفع الملفات
                          </span>
                        )}
                        {admin.canManageDatasets && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                            إدارة البيانات
                          </span>
                        )}
                        {admin.canManageSettings && (
                          <span className="px-2 py-1 bg-pink-100 text-pink-800 text-xs font-medium rounded-full">
                            إدارة الإعدادات
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        تم الإنشاء: {new Date(admin.createdAt).toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {editingAdmin === admin.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditAdmin(admin.id)}
                          className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                        >
                          حفظ
                        </button>
                        <button
                          onClick={() => {
                            setEditingAdmin(null);
                            setEditAdminUsername("");
                            setEditAdminPassword("");
                            setEditAdminIsHead(false);
                            setEditAdminCanUpload(true);
                            setEditAdminCanManageDatasets(true);
                            setEditAdminCanManageSettings(false);
                          }}
                          className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                        >
                          إلغاء
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => startEditAdmin(admin)}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 flex items-center gap-1 text-sm"
                        >
                          <Edit2 className="w-4 h-4" />
                          تعديل
                        </button>
                        {admin.username !== currentAdmin?.username && (
                          <button
                            onClick={() => handleDeleteAdmin(admin.id, admin.username)}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 flex items-center gap-1 text-sm"
                          >
                            <Trash2 className="w-4 h-4" />
                            حذف
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

              {/* Inline Edit Form */}
              {editingAdmin && admins.find(a => a.id === editingAdmin) && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="font-medium text-gray-900 mb-3">تعديل المسؤول</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        اسم المستخدم
                      </label>
                      <input
                        type="text"
                        value={editAdminUsername}
                        onChange={(e) => setEditAdminUsername(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        كلمة المرور الجديدة (اتركها فارغة للاحتفاظ بالقديمة)
                      </label>
                      <input
                        type="password"
                        value={editAdminPassword}
                        onChange={(e) => setEditAdminPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="أدخل كلمة مرور جديدة"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="editAdminIsHead"
                          checked={editAdminIsHead}
                          onChange={(e) => setEditAdminIsHead(e.target.checked)}
                          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                        <label htmlFor="editAdminIsHead" className="text-sm text-gray-700">
                          رئيس المسؤولين
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="editAdminCanUpload"
                          checked={editAdminCanUpload}
                          onChange={(e) => setEditAdminCanUpload(e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="editAdminCanUpload" className="text-sm text-gray-700">
                          يمكنه رفع الملفات
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="editAdminCanManageDatasets"
                          checked={editAdminCanManageDatasets}
                          onChange={(e) => setEditAdminCanManageDatasets(e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="editAdminCanManageDatasets" className="text-sm text-gray-700">
                          يمكنه إدارة مجموعات البيانات
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="editAdminCanManageSettings"
                          checked={editAdminCanManageSettings}
                          onChange={(e) => setEditAdminCanManageSettings(e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="editAdminCanManageSettings" className="text-sm text-gray-700">
                          يمكنه إدارة إعدادات صفحات البحث
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Progress Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-center mb-4">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
              Uploading Files
            </h3>
            <p className="text-sm text-gray-600 text-center mb-6">
              Please wait while we process your files...
            </p>
            
            {/* Progress Bar */}
            <div className="w-full space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700 font-medium">Progress</span>
                <span className="text-blue-600 font-semibold">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out flex items-center justify-end pr-1"
                  style={{ width: `${uploadProgress}%` }}
                >
                  {uploadProgress > 10 && (
                    <span className="text-xs text-white font-medium">{uploadProgress}%</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-4 text-xs text-gray-500 text-center">
              {uploadProgress < 50 && "Uploading files..."}
              {uploadProgress >= 50 && uploadProgress < 90 && "Processing data..."}
              {uploadProgress >= 90 && uploadProgress < 100 && "Finalizing..."}
              {uploadProgress === 100 && "Complete!"}
            </div>
          </div>
        </div>
      )}

      {/* Create Admin Modal */}
      {showCreateAdminModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">إضافة مسؤول جديد</h3>
              <button
                onClick={() => setShowCreateAdminModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اسم المستخدم
                </label>
                <input
                  type="text"
                  value={newAdminUsername}
                  onChange={(e) => setNewAdminUsername(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="أدخل اسم المستخدم"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  كلمة المرور
                </label>
                <input
                  type="password"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="أدخل كلمة المرور"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="newAdminIsHead"
                    checked={newAdminIsHead}
                    onChange={(e) => setNewAdminIsHead(e.target.checked)}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="newAdminIsHead" className="text-sm text-gray-700">
                    رئيس المسؤولين
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="newAdminCanUpload"
                    checked={newAdminCanUpload}
                    onChange={(e) => setNewAdminCanUpload(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="newAdminCanUpload" className="text-sm text-gray-700">
                    يمكنه رفع الملفات
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="newAdminCanManageDatasets"
                    checked={newAdminCanManageDatasets}
                    onChange={(e) => setNewAdminCanManageDatasets(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="newAdminCanManageDatasets" className="text-sm text-gray-700">
                    يمكنه إدارة مجموعات البيانات
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="newAdminCanManageSettings"
                    checked={newAdminCanManageSettings}
                    onChange={(e) => setNewAdminCanManageSettings(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="newAdminCanManageSettings" className="text-sm text-gray-700">
                    يمكنه إدارة إعدادات صفحات البحث
                  </label>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateAdmin}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  إنشاء
                </button>
                <button
                  onClick={() => setShowCreateAdminModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
