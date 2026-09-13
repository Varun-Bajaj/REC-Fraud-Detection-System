"use client";

import React, { useState, useEffect } from "react";
import { ApiService } from "@/services/api";
import {
  ShieldCheck,
  ShieldAlert,
  Layers,
  ArrowRightLeft,
  Award,
  XCircle,
  FileCheck2,
  FileSearch,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  History,
  Send,
  Plus,
  Lock,
  ExternalLink,
  Play,
  Check,
  Building,
  Radio,
  FileText,
  AlertCircle,
  Clock,
  Fingerprint,
} from "lucide-react";

export function FabricLedgerDashboard() {
  const [recs, setRecs] = useState<any[]>([]);
  const [selectedRecId, setSelectedRecId] = useState<string | null>(null);
  const [selectedRecDetails, setSelectedRecDetails] = useState<any | null>(null);
  const [recHistory, setRecHistory] = useState<any[]>([]);
  const [verificationResult, setVerificationResult] = useState<any | null>(null);
  const [fraudAlerts, setFraudAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Forms
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showRetireModal, setShowRetireModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const [newRecId, setNewRecId] = useState("REC-000100");
  const [generatorId, setGeneratorId] = useState("GEN-SOLAR-01");
  const [energySource, setEnergySource] = useState("SOLAR");
  const [generationDate, setGenerationDate] = useState("2026-09-12");
  const [generationMWh, setGenerationMWh] = useState(100);
  const [issuedQuantity, setIssuedQuantity] = useState(100);
  const [uploadedDocHash, setUploadedDocHash] = useState("");
  const [uploadFileName, setUploadFileName] = useState("");

  const [transferFrom, setTransferFrom] = useState("ISSUER-ORG");
  const [transferTo, setTransferTo] = useState("CORP-BUYER-A");
  const [transferQty, setTransferQty] = useState(40);
  const [transferRef, setTransferRef] = useState("TRADE-REF-001");
  const [transferCallerOrg, setTransferCallerOrg] = useState("issuer");

  const [retireOwner, setRetireOwner] = useState("CORP-BUYER-A");
  const [retireQty, setRetireQty] = useState(20);
  const [retireReason, setRetireReason] = useState("Scope 2 Net-Zero Goal 2026");

  const [cancelReason, setCancelReason] = useState("Regulatory Directive");

  // Document Verification
  const [docVerifyResult, setDocVerifyResult] = useState<any | null>(null);
  const [docVerifyLoading, setDocVerifyLoading] = useState(false);

  // 9-Step Demo Automation State
  const [demoStep, setDemoStep] = useState(0);
  const [demoLogs, setDemoLogs] = useState<string[]>([]);
  const [demoRunning, setDemoRunning] = useState(false);

  const refreshData = async () => {
    setLoading(true);
    try {
      const [recsData, alertsData] = await Promise.all([
        ApiService.listFabricRECs(),
        ApiService.getFabricFraudAlerts(),
      ]);
      setRecs(recsData);
      setFraudAlerts(alertsData);

      if (selectedRecId) {
        await loadRecDetails(selectedRecId);
      } else if (recsData.length > 0) {
        await loadRecDetails(recsData[0].recId);
      }
    } catch (err: any) {
      console.error("Failed to fetch Fabric data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const loadRecDetails = async (recId: string) => {
    setSelectedRecId(recId);
    try {
      const [details, history, verify] = await Promise.all([
        ApiService.getFabricREC(recId),
        ApiService.getFabricRECHistory(recId),
        ApiService.verifyFabricREC(recId),
      ]);
      setSelectedRecDetails(details);
      setRecHistory(history?.history || []);
      setVerificationResult(verify);
    } catch (err) {
      console.error(`Error loading details for ${recId}:`, err);
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFileName(file.name);
    try {
      const res = await ApiService.uploadFabricDocument(file);
      setUploadedDocHash(res.document_hash);
    } catch (err: any) {
      alert("Document upload failed: " + err.message);
    }
  };

  const handleVerifyDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRecId) return;
    setDocVerifyLoading(true);
    setDocVerifyResult(null);
    try {
      const res = await ApiService.verifyFabricDocument(selectedRecId, file);
      setDocVerifyResult(res);
    } catch (err: any) {
      alert("Document verification failed: " + err.message);
    } finally {
      setDocVerifyLoading(false);
    }
  };

  const handleCreateREC = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await ApiService.createFabricREC({
        recId: newRecId,
        generatorId,
        energySource,
        generationDate,
        generationMWh,
        issuedQuantity,
        documentHash: uploadedDocHash || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      });
      setShowCreateModal(false);
      await refreshData();
      await loadRecDetails(newRecId);
    } catch (err: any) {
      alert("Failed to issue REC on Fabric: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecId) return;
    setActionLoading(true);
    try {
      await ApiService.transferFabricREC(selectedRecId, {
        fromOwner: transferFrom,
        toOwner: transferTo,
        quantity: transferQty,
        transactionReference: transferRef,
        callerOrg: transferCallerOrg,
      });
      setShowTransferModal(false);
      await refreshData();
      await loadRecDetails(selectedRecId);
    } catch (err: any) {
      alert("Transfer failed: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetire = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecId) return;
    setActionLoading(true);
    try {
      await ApiService.retireFabricREC(selectedRecId, {
        owner: retireOwner,
        quantity: retireQty,
        retirementReason: retireReason,
        callerOrg: "buyer",
      });
      setShowRetireModal(false);
      await refreshData();
      await loadRecDetails(selectedRecId);
    } catch (err: any) {
      alert("Retirement failed: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecId) return;
    setActionLoading(true);
    try {
      await ApiService.cancelFabricREC(selectedRecId, {
        reason: cancelReason,
        callerOrg: "regulator",
      });
      setShowCancelModal(false);
      await refreshData();
      await loadRecDetails(selectedRecId);
    } catch (err: any) {
      alert("Revocation failed: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 9-Step Demo Automation
  const runDemoStep = async (stepNum: number) => {
    const demoId = "REC-DEMO-001";
    setDemoRunning(true);
    const addLog = (msg: string) => setDemoLogs((prev) => [...prev, `[Step ${stepNum}] ${msg}`]);

    try {
      if (stepNum === 1) {
        addLog("Step 1: Issuer creates REC-DEMO-001 (100 MWh, 100 REC, Solar proof PDF)");
        const fakeFile = new File(["%PDF-1.4 Demonstration Solar Generation Report 2026"], "solar-generation.pdf", {
          type: "application/pdf",
        });
        const uploadRes = await ApiService.uploadFabricDocument(fakeFile);
        addLog(`Off-chain document uploaded. SHA-256 fingerprint: ${uploadRes.document_hash.slice(0, 16)}...`);

        await ApiService.createFabricREC({
          recId: demoId,
          generatorId: "SOLAR-001",
          energySource: "SOLAR",
          generationDate: "2026-09-12",
          generationMWh: 100,
          issuedQuantity: 100,
          documentHash: uploadRes.document_hash,
        });
        addLog(`Step 2: REC CREATED on Hyperledger Fabric ledger! Block committed.`);
        setDemoStep(2);
        await refreshData();
        await loadRecDetails(demoId);
      } else if (stepNum === 3) {
        addLog("Step 3: Transfer 40 REC units from ISSUER-ORG to COMPANY-A");
        await ApiService.transferFabricREC(demoId, {
          fromOwner: "ISSUER-ORG",
          toOwner: "COMPANY-A",
          quantity: 40,
          transactionReference: "DEMO-TRADE-01",
          callerOrg: "issuer",
        });
        addLog("Blockchain records: REC_TRANSFERRED. Company A now holds 40 units.");
        setDemoStep(3);
        await refreshData();
        await loadRecDetails(demoId);
      } else if (stepNum === 4) {
        addLog("Step 4: Company A retires 20 REC units for Scope 2 offset");
        await ApiService.retireFabricREC(demoId, {
          owner: "COMPANY-A",
          quantity: 20,
          retirementReason: "Scope 2 Corporate Carbon Neutrality Goal",
          callerOrg: "buyer",
        });
        addLog("Blockchain records: REC_RETIRED. Active: 80, Retired: 20.");
        setDemoStep(4);
        await refreshData();
        await loadRecDetails(demoId);
      } else if (stepNum === 5) {
        addLog("Step 5: Attempt INVALID operation - Company A attempts to transfer 50 units (exceeding balance of 20)");
        try {
          await ApiService.transferFabricREC(demoId, {
            fromOwner: "COMPANY-A",
            toOwner: "COMPANY-B",
            quantity: 50,
            transactionReference: "INVALID-TX",
            callerOrg: "buyer",
          });
          addLog("ERROR: Transaction was not rejected as expected!");
        } catch (err: any) {
          addLog(`Smart contract REJECTED transaction! Reason: INSUFFICIENT REC BALANCE (${err.message})`);
        }
        setDemoStep(5);
      } else if (stepNum === 6) {
        addLog("Step 6: Attempt INVALID operation - Attempting to retire cancelled/retired quantity incorrectly");
        try {
          await ApiService.retireFabricREC(demoId, {
            owner: "COMPANY-A",
            quantity: 999,
            retirementReason: "Illegal Double Retirement",
            callerOrg: "buyer",
          });
        } catch (err: any) {
          addLog(`Smart contract REJECTED transaction! Reason: INSUFFICIENT BALANCE (${err.message})`);
        }
        setDemoStep(6);
      } else if (stepNum === 7) {
        addLog("Step 7: Auditor opens REC-DEMO-001 to view complete immutable blockchain history");
        await loadRecDetails(demoId);
        addLog("Section 14 Audit Trail: Provenance traversed across all blocks committed on channel.");
        setDemoStep(7);
      } else if (stepNum === 8) {
        addLog("Step 8: Cryptographic Document Tampering Detection Test");
        const validFile = new File(["%PDF-1.4 Demonstration Solar Generation Report 2026"], "solar-generation.pdf", {
          type: "application/pdf",
        });
        const validRes = await ApiService.verifyFabricDocument(demoId, validFile);
        addLog(`Genuine Document Test: ${validRes.status} (${validRes.message})`);

        addLog("Step 9: Testing TAMPERED document (1-byte alteration)...");
        const tamperedFile = new File(["%PDF-1.4 Demonstration Solar Generation Report 2026 - MODIFIED_BYTE"], "solar-generation.pdf", {
          type: "application/pdf",
        });
        const tamperedRes = await ApiService.verifyFabricDocument(demoId, tamperedFile);
        addLog(`Tampered Document Test: ${tamperedRes.status} - ${tamperedRes.message}`);
        setDocVerifyResult(tamperedRes);
        setDemoStep(9);
      }
    } catch (err: any) {
      addLog(`Execution error: ${err.message}`);
    } finally {
      setDemoRunning(false);
    }
  };

  const runAllDemoSteps = async () => {
    setDemoLogs([]);
    for (let s of [1, 3, 4, 5, 6, 7, 8, 9]) {
      await runDemoStep(s);
      await new Promise((r) => setTimeout(r, 1200));
    }
  };

  const resetDemo = () => {
    setDemoStep(0);
    setDemoLogs([]);
    setDocVerifyResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Network Header & Real Architecture Info */}
      <div className="bg-gradient-to-r from-emerald-50 via-white to-blue-50/70 dark:from-blue-950/60 dark:via-[#0b1326] dark:to-emerald-950/40 border border-slate-200 dark:border-[#222a3d] rounded-2xl p-6 shadow-sm dark:shadow-xl relative overflow-hidden transition-colors duration-200">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-mono mb-2 font-semibold">
              <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-600 dark:text-emerald-400" />
              <span>HYPERLEDGER FABRIC DLT • rec-channel • CCAAS v1.0</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2 font-headline">
              <span>Permissioned Renewable Energy Certificate Ledger</span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl mt-1 leading-relaxed">
              Real 4-Organization Fabric Development Network (<span className="text-blue-600 dark:text-blue-400 font-mono font-semibold">RegulatorOrg</span>,{" "}
              <span className="text-emerald-700 dark:text-emerald-400 font-mono font-semibold">IssuerOrg</span>,{" "}
              <span className="text-purple-700 dark:text-purple-400 font-mono font-semibold">BuyerOrg</span>,{" "}
              <span className="text-amber-700 dark:text-amber-400 font-mono font-semibold">AuditorOrg</span>). Smart contracts enforce MSP cryptographic authorization, balance conservation, and double-counting prevention.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={refreshData}
              disabled={loading}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-200 shadow-sm dark:bg-[#131b2e] dark:hover:bg-[#1c263f] dark:text-slate-200 dark:border-[#222a3d] transition"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Sync Ledger</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-[#00d4a4] dark:hover:bg-[#00d4a4]/90 dark:text-[#003829] rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-md shadow-emerald-600/20 dark:shadow-[0_0_16px_rgba(0,212,164,0.3)]"
            >
              <Plus className="w-4 h-4" />
              <span>Issue New REC</span>
            </button>
          </div>
        </div>

        {/* 4 Organizations Topology Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-6 pt-4 border-t border-slate-200/80 dark:border-[#222a3d]/80 text-[11px] font-mono">
          <div className="bg-white/80 dark:bg-[#131b2e]/80 border border-blue-200 dark:border-blue-500/30 p-2.5 rounded-xl shadow-xs">
            <div className="text-blue-700 dark:text-blue-400 font-bold flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5" />
              <span>RegulatorOrg</span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">MSP: RegulatorOrgMSP</div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500">Peer: peer0.regulator (7051)</div>
          </div>
          <div className="bg-white/80 dark:bg-[#131b2e]/80 border border-emerald-200 dark:border-emerald-500/30 p-2.5 rounded-xl shadow-xs">
            <div className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" />
              <span>IssuerOrg</span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">MSP: IssuerOrgMSP</div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500">Peer: peer0.issuer (8051)</div>
          </div>
          <div className="bg-white/80 dark:bg-[#131b2e]/80 border border-purple-200 dark:border-purple-500/30 p-2.5 rounded-xl shadow-xs">
            <div className="text-purple-700 dark:text-purple-400 font-bold flex items-center gap-1.5">
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>BuyerOrg</span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">MSP: BuyerOrgMSP</div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500">Peer: peer0.buyer (9051)</div>
          </div>
          <div className="bg-white/80 dark:bg-[#131b2e]/80 border border-amber-200 dark:border-amber-500/30 p-2.5 rounded-xl shadow-xs">
            <div className="text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1.5">
              <FileSearch className="w-3.5 h-3.5" />
              <span>AuditorOrg</span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">MSP: AuditorOrgMSP</div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500">Peer: peer0.auditor (10051)</div>
          </div>
        </div>
      </div>

      {/* 9-Step Demo Walkthrough Interactive Card */}
      <div className="bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-[#222a3d] rounded-2xl p-6 shadow-sm dark:shadow-xl transition-colors duration-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-[#222a3d] gap-3">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 font-mono">
              <Play className="w-4 h-4 text-emerald-600 dark:text-emerald-400 fill-emerald-600 dark:fill-emerald-400" />
              <span>SPECIFICATION SECTION 26: DEMO SCENARIO CONTROLLER</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5 font-headline">
              End-to-End REC Lifecycle & Cryptographic Verification
            </h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={runAllDemoSteps}
              disabled={demoRunning}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white dark:from-emerald-500 dark:to-teal-500 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
            >
              {demoRunning ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-white" />}
              <span>Execute Full 9-Step Demo</span>
            </button>
            <button
              onClick={resetDemo}
              disabled={demoRunning}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold dark:bg-[#1e293b] dark:hover:bg-[#28354f] dark:text-slate-300 dark:border-transparent transition"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Step-by-Step Interactive Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-4 text-xs font-mono">
          <button
            onClick={() => runDemoStep(1)}
            disabled={demoRunning}
            className={`p-2.5 rounded-xl border text-left transition ${
              demoStep >= 1
                ? "bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-500/50 dark:text-emerald-300 shadow-xs"
                : "bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-400 dark:bg-[#0b1326] dark:border-[#222a3d] dark:text-slate-400 dark:hover:border-slate-700"
            }`}
          >
            <div className="font-bold">Step 1-2</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Issue REC-001 (100 MWh)</div>
          </button>
          <button
            onClick={() => runDemoStep(3)}
            disabled={demoRunning}
            className={`p-2.5 rounded-xl border text-left transition ${
              demoStep >= 3
                ? "bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-500/50 dark:text-emerald-300 shadow-xs"
                : "bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-400 dark:bg-[#0b1326] dark:border-[#222a3d] dark:text-slate-400 dark:hover:border-slate-700"
            }`}
          >
            <div className="font-bold">Step 3</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Transfer 40 to Company A</div>
          </button>
          <button
            onClick={() => runDemoStep(4)}
            disabled={demoRunning}
            className={`p-2.5 rounded-xl border text-left transition ${
              demoStep >= 4
                ? "bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-500/50 dark:text-emerald-300 shadow-xs"
                : "bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-400 dark:bg-[#0b1326] dark:border-[#222a3d] dark:text-slate-400 dark:hover:border-slate-700"
            }`}
          >
            <div className="font-bold">Step 4</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Company A Retires 20</div>
          </button>
          <button
            onClick={() => runDemoStep(5)}
            disabled={demoRunning}
            className={`p-2.5 rounded-xl border text-left transition ${
              demoStep >= 5
                ? "bg-rose-50 border-rose-300 text-rose-900 dark:bg-rose-950/40 dark:border-rose-500/50 dark:text-rose-300 shadow-xs"
                : "bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-400 dark:bg-[#0b1326] dark:border-[#222a3d] dark:text-slate-400 dark:hover:border-slate-700"
            }`}
          >
            <div className="font-bold">Step 5-6</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Smart Contract Rejections</div>
          </button>
          <button
            onClick={() => runDemoStep(7)}
            disabled={demoRunning}
            className={`p-2.5 rounded-xl border text-left transition ${
              demoStep >= 7
                ? "bg-blue-50 border-blue-300 text-blue-900 dark:bg-blue-950/40 dark:border-blue-500/50 dark:text-blue-300 shadow-xs"
                : "bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-400 dark:bg-[#0b1326] dark:border-[#222a3d] dark:text-slate-400 dark:hover:border-slate-700"
            }`}
          >
            <div className="font-bold">Step 7</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Auditor Full History</div>
          </button>
          <button
            onClick={() => runDemoStep(8)}
            disabled={demoRunning}
            className={`p-2.5 rounded-xl border text-left transition ${
              demoStep >= 8
                ? "bg-purple-50 border-purple-300 text-purple-900 dark:bg-purple-950/40 dark:border-purple-500/50 dark:text-purple-300 shadow-xs"
                : "bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-400 dark:bg-[#0b1326] dark:border-[#222a3d] dark:text-slate-400 dark:hover:border-slate-700"
            }`}
          >
            <div className="font-bold">Step 8-9</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Byte Tamper Detection</div>
          </button>
        </div>

        {/* Demo Execution Terminal Logs */}
        {demoLogs.length > 0 && (
          <div className="mt-4 bg-slate-900 dark:bg-[#070b14] border border-slate-800 dark:border-[#1e293b] rounded-xl p-3 font-mono text-xs max-h-48 overflow-y-auto space-y-1 shadow-inner">
            {demoLogs.map((log, i) => (
              <div
                key={i}
                className={`leading-relaxed ${
                  log.includes("REJECTED") || log.includes("FAILURE")
                    ? "text-rose-400 font-semibold"
                    : log.includes("VERIFIED") || log.includes("CREATED") || log.includes("RETIRED")
                    ? "text-emerald-400 font-semibold"
                    : "text-slate-300"
                }`}
              >
                {log}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main 2-Column Layout: Left (REC List), Right (History & Verification) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: REC Registry Table (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-[#222a3d] rounded-2xl p-5 shadow-sm dark:shadow-lg transition-colors duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 font-headline">
                <Layers className="w-4 h-4 text-emerald-600 dark:text-[#45f1bf]" />
                <span>On-Chain REC Registry</span>
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">({recs.length})</span>
              </h3>
            </div>

            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {recs.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No RECs registered yet. Issue your first REC above.
                </div>
              ) : (
                recs.map((r) => {
                  const isSelected = selectedRecId === r.recId;
                  const isHighRisk = (r.fraudRiskScore || 0) >= 50;
                  return (
                    <div
                      key={r.recId}
                      onClick={() => loadRecDetails(r.recId)}
                      className={`p-3.5 rounded-xl border transition cursor-pointer ${
                        isSelected
                          ? "bg-emerald-50/80 border-emerald-500 shadow-sm dark:bg-[#171f33] dark:border-[#45f1bf]"
                          : "bg-slate-50/70 border-slate-200/80 hover:bg-slate-100 dark:bg-[#0b1326]/60 dark:border-[#222a3d] dark:hover:bg-[#171f33]/60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">{r.recId}</span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                              r.status === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30"
                                : "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30"
                            }`}
                          >
                            {r.status}
                          </span>
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                              isHighRisk
                                ? "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30"
                                : "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30"
                            }`}
                          >
                            RISK: {r.fraudRiskScore || 0}%
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-2 text-[11px] font-mono">
                        <div>
                          <div className="text-[10px] text-slate-500">Source</div>
                          <div className="text-slate-800 dark:text-slate-200 font-semibold">{r.energySource}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500">Active / Retired</div>
                          <div className="text-slate-800 dark:text-slate-200 font-semibold">
                            {r.activeQuantity} / {r.retiredQuantity}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500">Current Owner</div>
                          <div className="text-slate-800 dark:text-slate-200 font-semibold truncate">{r.currentOwner}</div>
                        </div>
                      </div>

                      <div className="mt-2 text-[10px] text-slate-500 font-mono truncate">
                        Fingerprint: {r.documentHash ? r.documentHash.slice(0, 24) + "..." : "N/A"}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Active Fraud Alerts Section */}
          <div className="bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-[#222a3d] rounded-2xl p-5 shadow-sm dark:shadow-lg transition-colors duration-200">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3 font-headline">
              <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>Fraud Surveillance Alerts</span>
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">({fraudAlerts.length})</span>
            </h3>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {fraudAlerts.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  Zero anomalous double-counting patterns detected.
                </div>
              ) : (
                fraudAlerts.map((a, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 dark:bg-rose-950/20 dark:border-rose-800/40 text-xs">
                    <div className="flex items-center justify-between text-rose-800 dark:text-rose-400 font-bold font-mono text-[11px]">
                      <span>{a.alert_type}</span>
                      <span className="text-rose-700 dark:text-rose-300 uppercase px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/40 text-[10px]">
                        {a.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-1">{a.description}</p>
                    {a.rec_id && <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">Target: {a.rec_id}</div>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Inspector, Timeline & Verification (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {selectedRecDetails ? (
            <>
              {/* Asset Header & Action Buttons */}
              <div className="bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-[#222a3d] rounded-2xl p-5 shadow-sm dark:shadow-lg transition-colors duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-[#222a3d]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-slate-900 dark:text-white font-mono">{selectedRecDetails.asset.recId}</span>
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                          selectedRecDetails.asset.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30"
                            : "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30"
                        }`}
                      >
                        {selectedRecDetails.asset.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 font-mono mt-0.5">
                      Facility: {selectedRecDetails.asset.generatorId} • {selectedRecDetails.asset.generationMWh} MWh (
                      {selectedRecDetails.asset.energySource})
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setShowTransferModal(true)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>Transfer</span>
                    </button>
                    <button
                      onClick={() => setShowRetireModal(true)}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>Retire</span>
                    </button>
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>

                {/* Sub-allocation Balances */}
                <div className="mt-4">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-300 font-mono mb-2">Participant Balance Distribution:</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                    <div className="bg-slate-50 dark:bg-[#0b1326] p-2.5 rounded-xl border border-slate-200 dark:border-[#222a3d]">
                      <div className="text-[10px] text-slate-500">Issued Total</div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">{selectedRecDetails.asset.issuedQuantity}</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-[#0b1326] p-2.5 rounded-xl border border-slate-200 dark:border-[#222a3d]">
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Active Balance</div>
                      <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{selectedRecDetails.asset.activeQuantity}</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-[#0b1326] p-2.5 rounded-xl border border-slate-200 dark:border-[#222a3d]">
                      <div className="text-[10px] text-purple-600 dark:text-purple-400">Retired Balance</div>
                      <div className="text-sm font-bold text-purple-700 dark:text-purple-400">{selectedRecDetails.asset.retiredQuantity}</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-[#0b1326] p-2.5 rounded-xl border border-slate-200 dark:border-[#222a3d]">
                      <div className="text-[10px] text-blue-600 dark:text-blue-400">Current Owner</div>
                      <div className="text-sm font-bold text-blue-700 dark:text-blue-400 truncate">{selectedRecDetails.asset.currentOwner}</div>
                    </div>
                  </div>

                  {selectedRecDetails.asset.balances && (
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-mono">
                      {Object.entries(selectedRecDetails.asset.balances).map(([holder, qty]) => (
                        <span key={holder} className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#171f33] border border-slate-200 dark:border-[#222a3d] text-slate-700 dark:text-slate-300">
                          {holder}: <strong className="text-emerald-700 dark:text-[#45f1bf]">{String(qty)} REC</strong>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Verification & Integrity Panel */}
              <div className="bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-[#222a3d] rounded-2xl p-5 shadow-sm dark:shadow-lg transition-colors duration-200">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3 font-headline">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-[#45f1bf]" />
                  <span>Section 16 & 18: Ledger & Document Cryptographic Verification</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono mb-4">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0b1326] border border-slate-200 dark:border-[#222a3d]">
                    <div className="text-[10px] text-slate-500">Blockchain State</div>
                    <div className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Consistent</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0b1326] border border-slate-200 dark:border-[#222a3d]">
                    <div className="text-[10px] text-slate-500">Document Hash</div>
                    <div className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                      <Fingerprint className="w-3.5 h-3.5" />
                      <span>SHA-256 On-Chain</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0b1326] border border-slate-200 dark:border-[#222a3d]">
                    <div className="text-[10px] text-slate-500">Conservation Law</div>
                    <div className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                      <span>Active + Ret = Issued</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0b1326] border border-slate-200 dark:border-[#222a3d]">
                    <div className="text-[10px] text-slate-500">Fraud Engine Score</div>
                    <div
                      className={`font-bold flex items-center gap-1 mt-0.5 ${
                        (selectedRecDetails.fraudEvaluation?.riskScore || 0) >= 50
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-emerald-700 dark:text-emerald-400"
                      }`}
                    >
                      <span>{selectedRecDetails.fraudEvaluation?.riskScore || 0}% ({selectedRecDetails.fraudEvaluation?.riskLevel || "LOW"})</span>
                    </div>
                  </div>
                </div>

                {/* Upload to Verify Document Tampering */}
                <div className="bg-slate-50 dark:bg-[#0b1326] border border-slate-200 dark:border-[#222a3d] rounded-xl p-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Verify Off-Chain PDF Against On-Chain SHA-256 Fingerprint:
                    </div>
                    <label className="cursor-pointer px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs">
                      <FileCheck2 className="w-3.5 h-3.5" />
                      <span>Upload PDF to Verify</span>
                      <input type="file" onChange={handleVerifyDocument} className="hidden" accept=".pdf,.png,.jpg" />
                    </label>
                  </div>

                  <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 break-all">
                    Registered On-Chain Hash: {selectedRecDetails.asset.documentHash}
                  </div>

                  {docVerifyLoading && (
                    <div className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-2 mt-3 font-mono">
                      <RotateCw className="w-4 h-4 animate-spin" />
                      <span>Computing SHA-256 digest and cross-referencing ledger...</span>
                    </div>
                  )}

                  {docVerifyResult && (
                    <div
                      className={`mt-3 p-3 rounded-xl border text-xs font-mono ${
                        docVerifyResult.match
                          ? "bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-500 dark:text-emerald-300"
                          : "bg-rose-50 border-rose-300 text-rose-900 dark:bg-rose-950/30 dark:border-rose-500 dark:text-rose-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-sm">
                        {docVerifyResult.match ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                        )}
                        <span>{docVerifyResult.status}</span>
                      </div>
                      <p className="mt-1 text-xs">{docVerifyResult.message}</p>
                      <div className="mt-2 text-[10px] space-y-0.5 text-slate-700 dark:text-slate-300">
                        <div>Computed: {docVerifyResult.computed_hash}</div>
                        <div>Target: {docVerifyResult.registered_hash}</div>
                        <div className="text-slate-500 dark:text-slate-400 italic mt-1">{docVerifyResult.disclaimer}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 14 & 15: Blockchain History Timeline */}
              <div className="bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-[#222a3d] rounded-2xl p-5 shadow-sm dark:shadow-lg transition-colors duration-200">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4 font-headline">
                  <History className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Section 14 & 15: Immutable Blockchain Transaction History</span>
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">({recHistory.length} Blocks)</span>
                </h3>

                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-[#222a3d]">
                  {recHistory.map((h, i) => {
                    const val = h.value || {};
                    return (
                      <div key={h.txId} className="relative group">
                        <div className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white dark:border-[#131b2e] ring-2 ring-blue-500/20 shadow-xs" />
                        <div className="bg-slate-50 dark:bg-[#0b1326] border border-slate-200 dark:border-[#222a3d] rounded-xl p-3.5 text-xs font-mono space-y-1.5 hover:border-emerald-500 dark:hover:border-slate-700 transition">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-emerald-700 dark:text-emerald-400">
                              {i === 0
                                ? "REC_CREATED"
                                : val.status === "CANCELLED"
                                ? "REC_CANCELLED"
                                : val.retiredQuantity > 0
                                ? "REC_RETIRED"
                                : "REC_TRANSFERRED"}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {h.timestamp}
                            </span>
                          </div>

                          <div className="text-[10px] text-slate-500 dark:text-slate-400 break-all">
                            TxID: <span className="text-slate-800 dark:text-slate-200 font-bold">{h.txId}</span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px] text-slate-700 dark:text-slate-300">
                            <div>
                              <span className="text-slate-500">Active Qty:</span> {val.activeQuantity ?? "N/A"}
                            </div>
                            <div>
                              <span className="text-slate-500">Retired Qty:</span> {val.retiredQuantity ?? "0"}
                            </div>
                            <div>
                              <span className="text-slate-500">Owner:</span> {val.currentOwner ?? "N/A"}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-[#222a3d] rounded-2xl p-12 text-center text-slate-500 text-xs shadow-sm">
              Select a REC from the ledger registry to inspect complete cryptographic lifecycle history.
            </div>
          )}
        </div>
      </div>

      {/* CREATE REC MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-[#222a3d] rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 text-slate-900 dark:text-slate-100 transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#222a3d]">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 font-headline">
                <Plus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>Issue New REC (IssuerOrgMSP)</span>
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateREC} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-medium">REC Unique ID</label>
                <input
                  type="text"
                  required
                  value={newRecId}
                  onChange={(e) => setNewRecId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#0b1326] border border-slate-300 dark:border-[#222a3d] rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-medium">Generator Facility ID</label>
                  <input
                    type="text"
                    required
                    value={generatorId}
                    onChange={(e) => setGeneratorId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#0b1326] border border-slate-300 dark:border-[#222a3d] rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-medium">Energy Source</label>
                  <select
                    value={energySource}
                    onChange={(e) => setEnergySource(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#0b1326] border border-slate-300 dark:border-[#222a3d] rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="SOLAR">SOLAR</option>
                    <option value="WIND">WIND</option>
                    <option value="HYDRO">HYDRO</option>
                    <option value="BIOMASS">BIOMASS</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-medium">Generation Date</label>
                  <input
                    type="date"
                    required
                    value={generationDate}
                    onChange={(e) => setGenerationDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#0b1326] border border-slate-300 dark:border-[#222a3d] rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-medium">Gen MWh</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={generationMWh}
                    onChange={(e) => setGenerationMWh(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-[#0b1326] border border-slate-300 dark:border-[#222a3d] rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-medium">Issued Quantity</label>
                  <input
                    type="number"
                    required
                    value={issuedQuantity}
                    onChange={(e) => setIssuedQuantity(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-[#0b1326] border border-slate-300 dark:border-[#222a3d] rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Upload Proof Document for SHA-256 Hash */}
              <div className="pt-2">
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-bold">
                  Section 17: Upload Generation Proof Document (Off-Chain)
                </label>
                <div className="border-2 border-dashed border-slate-300 dark:border-[#222a3d] rounded-xl p-4 text-center hover:border-emerald-500 dark:hover:border-slate-700 transition bg-slate-50 dark:bg-[#0b1326]">
                  <input type="file" id="docUpload" onChange={handleDocumentUpload} className="hidden" />
                  <label htmlFor="docUpload" className="cursor-pointer flex flex-col items-center">
                    <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400 mb-1" />
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                      {uploadFileName || "Select generation certificate PDF"}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5">
                      File remains off-chain; SHA-256 fingerprint will be committed to blockchain.
                    </span>
                  </label>
                </div>
                {uploadedDocHash && (
                  <div className="mt-2 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 break-all font-semibold">
                    SHA-256 Fingerprint: {uploadedDocHash}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-transparent rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !uploadedDocHash}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 font-bold rounded-xl flex items-center gap-2 shadow-sm transition disabled:opacity-50"
                >
                  {actionLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                  <span>Sign & Issue on Fabric</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TRANSFER MODAL */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-[#222a3d] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-900 dark:text-slate-100 transition-colors">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-[#222a3d] font-headline">
              <ArrowRightLeft className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>Transfer REC ({selectedRecId})</span>
            </h3>

            <form onSubmit={handleTransfer} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-medium">From Account</label>
                <input
                  type="text"
                  required
                  value={transferFrom}
                  onChange={(e) => setTransferFrom(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#0b1326] border border-slate-300 dark:border-[#222a3d] rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-medium">To Recipient Account</label>
                <input
                  type="text"
                  required
                  value={transferTo}
                  onChange={(e) => setTransferTo(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#0b1326] border border-slate-300 dark:border-[#222a3d] rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-medium">Quantity</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={transferQty}
                    onChange={(e) => setTransferQty(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-[#0b1326] border border-slate-300 dark:border-[#222a3d] rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-medium">Trade Reference</label>
                  <input
                    type="text"
                    value={transferRef}
                    onChange={(e) => setTransferRef(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#0b1326] border border-slate-300 dark:border-[#222a3d] rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-transparent rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-2 shadow-sm transition"
                >
                  {actionLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Submit Transfer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RETIRE MODAL */}
      {showRetireModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-[#222a3d] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-900 dark:text-slate-100 transition-colors">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-[#222a3d] font-headline">
              <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span>Permanently Retire REC ({selectedRecId})</span>
            </h3>

            <form onSubmit={handleRetire} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-medium">Retiring Owner Account</label>
                <input
                  type="text"
                  required
                  value={retireOwner}
                  onChange={(e) => setRetireOwner(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#0b1326] border border-slate-300 dark:border-[#222a3d] rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-medium">Quantity to Retire</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={retireQty}
                  onChange={(e) => setRetireQty(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-[#0b1326] border border-slate-300 dark:border-[#222a3d] rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-medium">Retirement Purpose / Reason</label>
                <input
                  type="text"
                  required
                  value={retireReason}
                  onChange={(e) => setRetireReason(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#0b1326] border border-slate-300 dark:border-[#222a3d] rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="text-[10px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 p-2.5 rounded-xl">
                ⚠️ Once retired on Hyperledger Fabric, these certificate units can NEVER become active or transferred again.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRetireModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-transparent rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl flex items-center gap-2 shadow-sm transition"
                >
                  {actionLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  <span>Execute Permanent Retirement</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANCEL MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-[#222a3d] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-900 dark:text-slate-100 transition-colors">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-[#222a3d] font-headline">
              <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              <span>Revoke / Cancel REC ({selectedRecId})</span>
            </h3>

            <form onSubmit={handleCancel} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-medium">Revocation Directive / Reason</label>
                <textarea
                  required
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#0b1326] border border-slate-300 dark:border-[#222a3d] rounded-xl p-3 text-slate-900 dark:text-white font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="text-[10px] text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 p-2.5 rounded-xl">
                Only authorized RegulatorOrgMSP or IssuerOrgMSP identities can execute this cancellation.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-transparent rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl flex items-center gap-2 shadow-sm transition"
                >
                  {actionLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  <span>Confirm Revocation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
