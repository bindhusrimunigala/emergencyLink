import React from 'react';

const statusConfig = {
  // Emergency statuses
  pending:      { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
  assigned:     { bg: '#dbeafe', color: '#1e40af', label: 'Assigned' },
  en_route:     { bg: '#d1fae5', color: '#065f46', label: 'En Route' },
  at_scene:     { bg: '#e0e7ff', color: '#3730a3', label: 'At Scene' },
  transporting: { bg: '#fce7f3', color: '#9d174d', label: 'Transporting' },
  completed:    { bg: '#d1fae5', color: '#065f46', label: 'Completed' },
  cancelled:    { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' },
  // Ambulance statuses
  available:    { bg: '#d1fae5', color: '#065f46', label: 'Available' },
  dispatched:   { bg: '#dbeafe', color: '#1e40af', label: 'Dispatched' },
  maintenance:  { bg: '#fef3c7', color: '#92400e', label: 'Maintenance' },
  offline:      { bg: '#f1f5f9', color: '#475569', label: 'Offline' },
  // Priority
  low:          { bg: '#f1f5f9', color: '#475569', label: 'Low' },
  medium:       { bg: '#fef3c7', color: '#92400e', label: 'Medium' },
  high:         { bg: '#fee2e2', color: '#991b1b', label: 'High' },
  critical:     { bg: '#dc2626', color: '#fff',    label: '🔴 Critical' },
};

export default function StatusBadge({ status, size = 'sm' }) {
  const config = statusConfig[status] || { bg: '#f1f5f9', color: '#475569', label: status };
  const fontSize = size === 'sm' ? 11 : 13;

  return (
    <span style={{
      background: config.bg,
      color: config.color,
      padding: size === 'sm' ? '2px 8px' : '4px 12px',
      borderRadius: 12,
      fontSize,
      fontWeight: 600,
      display: 'inline-block',
      whiteSpace: 'nowrap',
    }}>
      {config.label}
    </span>
  );
}
