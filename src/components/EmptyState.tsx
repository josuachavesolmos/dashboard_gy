import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export default function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="icon-wrap">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
