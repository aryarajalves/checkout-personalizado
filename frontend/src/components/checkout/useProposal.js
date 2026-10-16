import { useState, useEffect } from 'react';

export function useProposal(slug, onProposalLoaded) {
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('proposal');
    if (!code) return;

    let isMounted = true;
    async function fetchProposal() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/v1/proposals/public/${encodeURIComponent(code)}`);
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
