import './VotesModal.css';

interface Vote {
  _id: string;
  userId: {
    username: string;
    displayName?: string;
    displayNameColor?: string;
    avatar?: string;
  };
  voteType: 'yes' | 'no';
  reason?: string;
}

interface VotesModalProps {
  movieTitle: string;
  moviePoster?: string;
  votes: Vote[];
  onClose: () => void;
}

const VotesModal = ({ movieTitle, moviePoster, votes, onClose }: VotesModalProps) => {
  const yesVotes = votes.filter(v => v.voteType === 'yes');
  const noVotes = votes.filter(v => v.voteType === 'no');

  return (
    <div className="votes-modal-overlay" onClick={onClose}>
      <div className="votes-modal" onClick={(e) => e.stopPropagation()}>
        <div className="votes-modal-header">
          <div className="votes-modal-title-section">
            {moviePoster && (
              <img src={moviePoster} alt={movieTitle} className="votes-modal-poster" />
            )}
            <div>
              <h2>{movieTitle}</h2>
              <p className="votes-modal-subtitle">
                {votes.length} {votes.length === 1 ? 'vote' : 'votes'} ({yesVotes.length} 👍 {noVotes.length} 👎)
              </p>
            </div>
          </div>
          <button className="votes-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="votes-modal-content">
          {votes.length === 0 ? (
            <div className="votes-modal-empty">
              No votes yet for this movie.
            </div>
          ) : (
            <div className="votes-list">
              {votes.map((vote) => (
                <div key={vote._id} className="vote-item">
                  <div className="vote-header">
                    <div className="vote-user">
                      {vote.userId?.avatar && (
                        <img
                          src={vote.userId.avatar}
                          alt={vote.userId.displayName || vote.userId.username}
                          className="vote-avatar"
                        />
                      )}
                      <span
                        className="vote-username"
                        style={{ color: vote.userId?.displayNameColor || '#000' }}
                      >
                        {vote.userId?.displayName || vote.userId?.username}
                      </span>
                    </div>
                    <span className={`vote-type ${vote.voteType === 'yes' ? 'yes' : 'no'}`}>
                      {vote.voteType === 'yes' ? '👍 YES' : '👎 NO'}
                    </span>
                  </div>
                  {vote.reason && (
                    <p className="vote-reason">{vote.reason}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VotesModal;
