import TweetVolumeChart from '../components/TweetVolumeChart'
import { useMembers } from '../hooks/useMembers'

function PipelineStep({ num, title, source, output, children }) {
  return (
    <div className="relative pl-12 pb-10 last:pb-0">
      {/* Connector line */}
      <div
        className="absolute left-[18px] top-9 bottom-0 w-px"
        style={{ background: 'var(--border)' }}
      />
      {/* Step number */}
      <div
        className="absolute left-0 top-0 w-9 h-9 rounded-full flex items-center justify-center mono text-[13px] font-medium"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-bright)',
          color: 'var(--gold)',
        }}
      >
        {num}
      </div>

      {/* Content */}
      <div>
        <h3
          className="m-0 mb-2 text-xl"
          style={{ fontFamily: '"DM Serif Display", serif', fontWeight: 400 }}
        >
          {title}
        </h3>
        <div className="flex flex-wrap gap-x-5 gap-y-1 mb-3 text-[11px] mono">
          {source && (
            <div className="text-ink-faint">
              <span className="opacity-70">in: </span>
              <span className="text-ink-muted">{source}</span>
            </div>
          )}
          {output && (
            <div className="text-ink-faint">
              <span className="opacity-70">out: </span>
              <span className="text-ink-muted">{output}</span>
            </div>
          )}
        </div>
        <div className="text-[14px] text-ink-muted leading-relaxed max-w-[720px]">
          {children}
        </div>
      </div>
    </div>
  )
}

function FeatureGroup({ title, count, examples, description }) {
  return (
    <div className="card">
      <div className="flex items-baseline justify-between mb-2">
        <h4 className="m-0 text-[14px] text-ink font-medium">{title}</h4>
        <span className="mono text-[11px] text-ink-faint">{count} features</span>
      </div>
      <p className="text-[12px] text-ink-muted leading-relaxed m-0 mb-3">
        {description}
      </p>
      <div className="flex gap-1.5 flex-wrap">
        {examples.map(ex => (
          <span
            key={ex}
            className="mono text-[10px] px-2 py-0.5 rounded"
            style={{
              background: 'var(--surface-2)',
              color: 'var(--ink-muted)',
              border: '1px solid var(--border)',
            }}
          >
            {ex}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function Methodology() {
  const members = useMembers()

  return (
    <div className="px-8 py-10 max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="mb-12">
        <div className="label mb-3">How the data was built</div>
        <h1
          className="m-0 mb-3 leading-tight"
          style={{
            fontFamily: '"DM Serif Display", serif',
            fontSize: '40px',
            fontWeight: 400,
          }}
        >
          Methodology
        </h1>
        <p className="text-ink-muted text-[15px] max-w-[720px] leading-relaxed">
          Building this dataset required threading together public records (FEC,
          OpenSecrets, VoteView) with primary tweet data scraped over multiple
          months. Below is the full pipeline — every stage, every source, every
          transformation.
        </p>
      </div>

      {/* Pipeline */}
      <section className="mb-16">
        <h2
          className="text-[11px] uppercase tracking-[0.6px] text-ink-faint mb-5"
          style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 500 }}
        >
          The pipeline
        </h2>

        <PipelineStep
          num={1}
          title="FEC matching"
          source="FEC quarterly filings · @unitedstates legislators DB"
          output="538 senators & representatives matched"
        >
          <p className="m-0 mb-2">
            Started with FEC quarterly Q3 2024 fundraising totals — small-donor share
            for every member of the 118th Congress. The FEC's name format
            (<span className="mono text-ink">"TaylorMarjorie Taylor Greene (R)"</span>) doesn't
            match anything cleanly, so the matching pipeline strips the run-together
            last-name prefix, extracts the party tag, and fuzzy-matches against the{' '}
            <span className="mono text-ink">@unitedstates</span> legislators JSON using token-sort ratio.
          </p>
          <p className="m-0">
            Auto-matching caught 429 of 538 rows above an 70 confidence threshold;
            108 were resolved with manual bioguide overrides for compound names
            (Marjorie Taylor Greene, Catherine Cortez Masto, Marie Gluesenkamp Perez)
            and members who left mid-cycle (e.g., George Santos). One row remained
            unresolved (a delegate without a clean match).
          </p>
        </PipelineStep>

        <PipelineStep
          num={2}
          title="Sample selection"
          source="Matched legislators (n=538)"
          output="House sample (n=425)"
        >
          <p className="m-0 mb-2">
            Limited the analysis to House members because Senators have six-year
            cycles that don't align with the FEC quarterly snapshot, and they raise
            money on a fundamentally different scale. Joined in DW-NOMINATE ideology
            scores (VoteView), district-level vote shares (MIT Election Lab), and
            chamber/party metadata.
          </p>
          <p className="m-0">
            The final sample stratifies members across small-donor virality
            quartiles to ensure analytical balance — every quartile has roughly
            equal representation, so models aren't dominated by the long tail of
            high-virality members.
          </p>
        </PipelineStep>

        <PipelineStep
          num={3}
          title="Tweet scraping"
          source="x.com via twikit (rotating accounts)"
          output={`${(members.reduce((a,m)=>a+(m.tweet_count??0),0) / 1000).toFixed(0)}K tweets across ${members.length} members`}
        >
          <p className="m-0 mb-2">
            Built a scraper using <span className="mono text-ink">twikit</span> with
            account rotation and rate-limit handling. Each member's tweets were
            queried in 3-day windows from January 2023 through November 2024 to
            stay below the per-window result cap. Multiple authenticated accounts
            cycle on rate-limit errors; a separate retry loop handles 404s and
            transient connection drops with exponential backoff up to 10 minutes.
          </p>
          <p className="m-0">
            Resume logic kicks in if the scraper crashes — it parses the existing
            CSV, finds each member's earliest scraped tweet, and skips any windows
            already covered. Members with no tweets in their range get a sentinel
            row to prevent re-attempting empty profiles. The whole scrape took
            roughly 6 weeks of background runtime across the rotating accounts.
          </p>
        </PipelineStep>

        <PipelineStep
          num={4}
          title="Sentiment & emotion scoring"
          source={`House tweets CSV (${(members.reduce((a,m)=>a+(m.tweet_count??0),0) / 1000).toFixed(0)}K rows)`}
          output="Per-tweet sentiment + 7-emotion probabilities"
        >
          <p className="m-0 mb-2">
            Each tweet runs through two pretrained transformer pipelines:
          </p>
          <ul className="m-0 mb-2 pl-5 text-[14px]">
            <li>
              <span className="mono text-ink">cardiffnlp/twitter-roberta-base-sentiment-latest</span>{' '}
              — fine-tuned on Twitter, returns <em>positive</em> / <em>negative</em> /{' '}
              <em>neutral</em> with confidence. A continuous{' '}
              <span className="mono text-ink">sentiment_score</span> in [−1, +1] is derived from the
              signed confidence.
            </li>
            <li>
              <span className="mono text-ink">j-hartmann/emotion-english-distilroberta-base</span>{' '}
              — returns probabilities across seven emotions: anger, disgust, fear,
              joy, sadness, surprise, neutral.
            </li>
          </ul>
          <p className="m-0">
            Light preprocessing only: URLs collapsed to <span className="mono text-ink">"http"</span>,
            mentions to <span className="mono text-ink">"@user"</span>, and excess whitespace
            stripped. No stopword removal or lowercasing — the models expect raw text.
          </p>
        </PipelineStep>

        <PipelineStep
          num={5}
          title="User-level aggregation"
          source="Enriched tweets (438K rows)"
          output="403 member-level rows × 87 features"
        >
          <p className="m-0 mb-2">
            Per-tweet scores collapse into per-member features through a layered aggregation. Tweet-level scores get averaged into{' '}
            <span className="mono text-ink">avg_anger</span>,{' '}
            <span className="mono text-ink">avg_fear</span>, etc. The proportion
            of tweets where each emotion was the dominant signal becomes{' '}
            <span className="mono text-ink">pct_*_dominant</span>. Behavioral
            metadata — hashtag use, reply rates, weekend posting — joins in alongside.
          </p>
          <p className="m-0">
            Caucus memberships were scraped from each caucus's official roster
            page (Squad, Freedom Caucus, Blue Dogs, etc.). Historical small-donor
            shares come from FEC filings going back to 2008 cycle-by-cycle.
          </p>
        </PipelineStep>
      </section>

      {/* Tweet volume distribution */}
      <section className="mb-16">
        <div className="mb-6">
          <h2
            className="text-[11px] uppercase tracking-[0.6px] text-ink-faint mb-2"
            style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 500 }}
          >
            Tweet volume distribution
          </h2>
          <h3
            className="m-0 mb-2"
            style={{
              fontFamily: '"DM Serif Display", serif',
              fontSize: '24px',
              fontWeight: 400,
            }}
          >
            How much each member tweets — and how that relates to other variables
          </h3>
          <p className="text-[13px] text-ink-muted max-w-[720px] leading-relaxed">
            Toggle the y-axis to see how scraped tweet volume tracks with virality,
            small-donor share, sentiment, outrage, or follower count. Tweet count
            varies by 100× across members — and the relationship with other variables
            is rarely linear.
          </p>
        </div>

        <TweetVolumeChart members={members} />
      </section>

      {/* Features */}
      <section className="mb-16">
        <div className="mb-6">
          <h2
            className="text-[11px] uppercase tracking-[0.6px] text-ink-faint mb-2"
            style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 500 }}
          >
            Feature engineering
          </h2>
          <h3
            className="m-0 mb-2"
            style={{
              fontFamily: '"DM Serif Display", serif',
              fontSize: '24px',
              fontWeight: 400,
            }}
          >
            87 features across seven groups
          </h3>
          <p className="text-[13px] text-ink-muted max-w-[720px] leading-relaxed">
            Most of the modeling effort went into feature construction. Sentiment and
            emotion scores get derived from per-tweet signals, log transforms address
            heavy-tailed engagement distributions, and historical fundraising covers
            eight election cycles back to 2008.
          </p>
        </div>

        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}
        >
          <FeatureGroup
            title="Sentiment & tone"
            count={6}
            examples={['avg_sentiment', 'sentiment_std', 'pct_negative', 'pct_positive', 'pct_extreme']}
            description="Continuous sentiment in [−1,+1] averaged per member, plus the share of tweets in each polarity bucket."
          />
          <FeatureGroup
            title="Emotion intensity"
            count={6}
            examples={['avg_anger', 'avg_fear', 'avg_joy', 'avg_disgust', 'avg_sadness']}
            description="Average per-tweet probability for each of the seven Hartmann emotions, plus a derived outrage index (anger + disgust)."
          />
          <FeatureGroup
            title="Dominant tone"
            count={5}
            examples={['pct_anger_dominant', 'pct_joy_dominant', 'pct_fear_dominant']}
            description="What proportion of a member's tweets had each emotion as the highest-probability label — a different lens from the average intensities."
          />
          <FeatureGroup
            title="Engagement & virality"
            count={8}
            examples={['avg_retweets_raw', 'log_avg_retweets', 'avg_likes_raw', 'engagement_rate', 'rt_like_ratio']}
            description="Raw and log-transformed retweet/like counts. Log forms address the heavy right tail in social engagement metrics."
          />
          <FeatureGroup
            title="Behavioral style"
            count={11}
            examples={['avg_hashtags', 'pct_replies', 'pct_off_hours', 'pct_weekend', 'avg_word_count']}
            description="How members tweet rather than what they tweet — posting cadence, reply behavior, and stylistic markers."
          />
          <FeatureGroup
            title="Member context"
            count={9}
            examples={['nominate_dim1', 'nominate_abs', 'terms_served', 'is_female', 'margin_of_victory', 'competitive']}
            description="Standard political science covariates: ideology (DW-NOMINATE), seniority, demographics, and electoral safety."
          />
          <FeatureGroup
            title="Caucus membership"
            count={8}
            examples={['is_squad', 'is_freedom_caucus', 'is_progressive', 'is_blue_dog']}
            description="Binary flags for membership in major ideological and moderate caucuses, scraped from each caucus's official roster."
          />
          <FeatureGroup
            title="Historical fundraising"
            count={10}
            examples={['pct_small_2008', 'pct_small_2018', 'pct_small_2022', 'pct_change_22_24']}
            description="Small-donor share for each election cycle 2008–2022, plus derived metrics like cycle-to-cycle change and rolling averages."
          />
        </div>
      </section>

      {/* Models */}
      <section className="mb-12">
        <div className="mb-6">
          <h2
            className="text-[11px] uppercase tracking-[0.6px] text-ink-faint mb-2"
            style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 500 }}
          >
            Modeling approach
          </h2>
          <h3
            className="m-0 mb-3"
            style={{
              fontFamily: '"DM Serif Display", serif',
              fontSize: '24px',
              fontWeight: 400,
            }}
          >
            From 87 candidates to 6 predictors
          </h3>
        </div>

        <div className="card">
          <p className="text-[14px] text-ink-muted leading-relaxed m-0 mb-3">
            Feature selection used three filters: VIF screening dropped predictors with
            VIF &gt; 10, univariate regression dropped predictors with p &gt; 0.10
            against the base model, and bidirectional stepwise selection on the
            survivors selected the final spec. The proportion-of-tone variants
            (e.g. <span className="mono text-ink">pct_fear_dominant</span>) were tested
            but failed VIF when combined with their average-intensity counterparts —
            r = 0.99 between <span className="mono text-ink">avg_fear</span> and{' '}
            <span className="mono text-ink">pct_fear_dominant</span>, so only the
            simpler form survived.
          </p>
          <p className="text-[14px] text-ink-muted leading-relaxed m-0">
            Robustness checks: bootstrapped coefficients (10K resamples) confirm the
            virality effect is stable across sample variation, and a placebo test
            using shuffled small-donor labels yields R² ≈ 0 as expected. See the{' '}
            <a href="/findings" className="text-gold no-underline hover:underline">
              Findings page
            </a>{' '}
            for the final model coefficients with interpretation.
          </p>
        </div>
      </section>

      {/* Footnote */}
      <div className="text-[11px] text-ink-faint border-t border-border pt-6">
        Code & notebooks:{' '}
        <a
          href="https://github.com/anhgo/26-spring-ngo-a"
          target="_blank"
          rel="noopener noreferrer"
          className="text-ink-muted hover:text-ink no-underline"
        >
          github.com/anhgo/26-spring-ngo-a
        </a>
      </div>
    </div>
  )
}
