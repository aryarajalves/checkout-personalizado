import { useState, useEffect } from 'react';

export function useProposal(slug, onProposalLoaded) {
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return Boolean(params.get('proposal'));
    } catch {
      return false;
    }
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    let code = null;
    try {
      const params = new URLSearchParams(window.location.search);
      code = params.get('proposal');
    } catch {}

    if (!code) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    async function fetchProposal() {
      setLoading(true);
      setError(null);
      try {
        const cleanCode = code.trim().replace(/\s+/g, '-');
        const res = await fetch(`/api/v1/proposals/public/${encodeURIComponent(cleanCode)}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || 'Proposta personalizada não encontrada.');
        }
        if (isMounted) {
          setProposal(data);
          if (onProposalLoaded) {
            onProposalLoaded(data);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Proposta personalizada não encontrada.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchProposal();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  return { proposal, loadingProposal: loading, proposalError: error };
}
