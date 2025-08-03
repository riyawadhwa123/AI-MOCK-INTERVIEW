"use client";

import React, { useState } from "react";

const defaultValues = {
  role: "",
  level: "junior",
  techstack: "",
  type: "technical",
  amount: 5,
};

interface CreateInterviewFormProps {
  userId: string;
}

const CreateInterviewForm = ({ userId }: CreateInterviewFormProps) => {
  const [form, setForm] = useState(defaultValues);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess("");
    setError("");
    try {
      const res = await fetch("/api/vapi/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          userid: userId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("Interview created successfully!");
        setForm(defaultValues);
      } else {
        setError("Failed to create interview.");
      }
    } catch (err) {
      setError("An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 400, margin: "2rem auto", padding: 24, border: "1px solid #eee", borderRadius: 8 }}>
      <h2 style={{ marginBottom: 16 }}>Create Interview</h2>
      <div style={{ marginBottom: 12 }}>
        <label>Role:</label>
        <input name="role" value={form.role} onChange={handleChange} required style={{ width: "100%" }} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label>Level:</label>
        <select name="level" value={form.level} onChange={handleChange} style={{ width: "100%" }}>
          <option value="junior">Junior</option>
          <option value="mid">Mid</option>
          <option value="senior">Senior</option>
        </select>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label>Tech Stack (comma separated):</label>
        <input name="techstack" value={form.techstack} onChange={handleChange} required style={{ width: "100%" }} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label>Type:</label>
        <select name="type" value={form.type} onChange={handleChange} style={{ width: "100%" }}>
          <option value="technical">Technical</option>
          <option value="behavioral">Behavioral</option>
          <option value="mixed">Mixed</option>
        </select>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label>Amount of Questions:</label>
        <input name="amount" type="number" min={1} max={20} value={form.amount} onChange={handleChange} required style={{ width: "100%" }} />
      </div>
      <button type="submit" disabled={loading} style={{ width: "100%", padding: 8 }}>
        {loading ? "Creating..." : "Create Interview"}
      </button>
      {success && <p style={{ color: "green", marginTop: 12 }}>{success}</p>}
      {error && <p style={{ color: "red", marginTop: 12 }}>{error}</p>}
    </form>
  );
};

export default CreateInterviewForm; 