// Builds and downloads a CSV attendance report — what the captain hands to
// the coach at the end of the semester.

export function exportAttendanceToCSV(records, teamMembers) {
  const nameById = Object.fromEntries(teamMembers.map((m) => [m.id, m.name || m.email]));

  const header = ["Name", "Date", "Time", "Within Geofence", "Distance (m)", "Record Hash"];
  const rows = records.map((r) => {
    const date = new Date(r.timestampMillis);
    return [
      nameById[r.userId] || r.userId,
      date.toLocaleDateString(),
      date.toLocaleTimeString(),
      r.withinGeofence ? "Yes" : "No",
      Math.round(r.distanceMeters ?? 0),
      r.recordHash,
    ];
  });

  const csvContent = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `attendance-report-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
