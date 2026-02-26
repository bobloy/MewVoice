import { useState } from 'react';

interface BaseVoicePack {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'other';
}

const BASE_PACKS: BaseVoicePack[] = [
  { id: 'male1', name: 'Jon Evans', gender: 'male' },
  { id: 'male2', name: 'Matthias Bossi', gender: 'male' },
  { id: 'male3', name: 'Edmund (as Guppy)', gender: 'male' },
  { id: 'male4', name: 'Eryck Lindquist', gender: 'male' },
  { id: 'male5', name: 'Joey Kuras', gender: 'male' },
  { id: 'male6', name: 'Ash', gender: 'male' },
  { id: 'male7', name: 'Viggo', gender: 'male' },
  { id: 'male8', name: 'Cody Glaiel', gender: 'male' },
  { id: 'male9', name: 'Cody Glaiel (metal)', gender: 'male' },
  { id: 'male10', name: 'Quentin Glaiel (young)', gender: 'male' },
  { id: 'male11', name: 'Quentin Glaiel (young)', gender: 'male' },
  { id: 'male12', name: 'Jeff (swearing cat) (speaks) (swears)', gender: 'male' },
  { id: 'male13', name: 'Ricky Berwick', gender: 'male' },
  { id: 'male14', name: 'Wubby', gender: 'male' },
  { id: 'male15', name: 'Steven Williams', gender: 'male' },
  { id: 'male16', name: 'Cliff Bleszinski', gender: 'male' },
  { id: 'male17', name: 'Sony Shock', gender: 'male' },
  { id: 'male18', name: 'Arin (deep)', gender: 'male' },
  { id: 'male19', name: 'Arin (nerdy)', gender: 'male' },
  { id: 'male20', name: 'Arin (nasally)', gender: 'male' },
  { id: 'male21', name: 'Tyler Glaiel', gender: 'male' },
  { id: 'male22', name: 'Tay Zonday', gender: 'male' },
  { id: 'male23', name: 'VSauce', gender: 'male' },
  { id: 'male24', name: 'VSauce', gender: 'male' },
  { id: 'male25', name: 'Ross Donovan', gender: 'male' },
  { id: 'male26', name: 'Vinny Vinesauce (cat)', gender: 'male' },
  { id: 'male27', name: 'Vinny Vinesauce (human cat)', gender: 'male' },
  { id: 'male28', name: 'Markiplier', gender: 'male' },
  { id: 'male29', name: 'Chills', gender: 'male' },
  { id: 'male30', name: 'Taylor Hall (noble)', gender: 'male' },
  { id: 'male31', name: 'Pelo', gender: 'male' },
  { id: 'male32', name: 'Rivers Cuomo', gender: 'male' },
  { id: 'male33', name: 'Logic', gender: 'male' },
  { id: 'male34', name: 'Yoav (autotune)', gender: 'male' },
  { id: 'male35', name: 'Derrick Acosta (Mega64)', gender: 'male' },
  { id: 'male36', name: 'Shawn Chatfield (Mega64)', gender: 'male' },
  { id: 'male37', name: 'Rocco Botte (Mega64)', gender: 'male' },
  { id: 'male38', name: 'David Harbour', gender: 'male' },
  { id: 'male39', name: 'hbomberguy (speaks)', gender: 'male' },
  { id: 'male40', name: 'Ethan from H3H (speaks)', gender: 'male' },
  { id: 'male41', name: 'Spencer Kling', gender: 'male' },
  { id: 'male42', name: 'David ROCK Nelson (speaks)', gender: 'male' },
  { id: 'male43', name: 'Michael Glaiel', gender: 'male' },
  { id: 'male44', name: 'Mister MV', gender: 'male' },
  { id: 'male45', name: 'Geno Samuel', gender: 'male' },
  { id: 'male46', name: 'Adam Johnston (YMS)', gender: 'male' },
  { id: 'male47', name: 'Adam Johnston (YMS) (speaks)', gender: 'male' },
  { id: 'male48', name: 'Carl Edge', gender: 'male' },
  { id: 'male49', name: 'Damian Abraham', gender: 'male' },
  { id: 'male50', name: 'Cody (Shannon and the Clams)', gender: 'male' },
  { id: 'male51', name: 'David Firth', gender: 'male' },
  { id: 'male52', name: 'Dusty', gender: 'male' },
  { id: 'male53', name: 'Froggy Fresh', gender: 'male' },
  { id: 'male54', name: 'Gavin Howell', gender: 'male' },
  { id: 'male55', name: 'Eli', gender: 'male' },
  { id: 'male56', name: 'Florian Himsl', gender: 'male' },
  { id: 'male57', name: 'Greg Sestero', gender: 'male' },
  { id: 'male58', name: 'Stinky Blue Rat', gender: 'male' },
  { id: 'male59', name: 'Liquid Chris', gender: 'male' },
  { id: 'male60', name: 'Sneegsnag (speaks)', gender: 'male' },
  { id: 'male61', name: 'Josh Tomar (cat)', gender: 'male' },
  { id: 'male62', name: 'Josh Tomar (human)', gender: 'male' },
  { id: 'male63', name: 'SwaggerSouls', gender: 'male' },
  { id: 'male64', name: 'Sam (Living Tomb Stones)', gender: 'male' },
  { id: 'male65', name: 'Tom Cardy', gender: 'male' },
  { id: 'male66', name: 'Mark DeCarlo', gender: 'male' },
  { id: 'male67', name: 'The Professor (speaks)', gender: 'male' },
  { id: 'male68', name: 'Jack Packard (smeegle cat)', gender: 'male' },
  { id: 'male69', name: 'Jack Packard (hunky cat) (speaks)', gender: 'male' },
  { id: 'male70', name: 'Ragman', gender: 'male' },
  { id: 'male71', name: 'Zach Hadel', gender: 'male' },
  { id: 'male72', name: 'Taylor Hall', gender: 'male' },
  { id: 'male73', name: 'maxmoefoe (cat)', gender: 'male' },
  { id: 'male74', name: 'maxmoefoe (funny) (speaks & swears)', gender: 'male' },
  { id: 'male75', name: 'idubbbz', gender: 'male' },
  { id: 'male76', name: 'Andrew Bowser (Onyx The Fortuitous) (speaks)', gender: 'male' },
  { id: 'male77', name: 'Rich Evans (human)', gender: 'male' },
  { id: 'male78', name: 'Rich Evans (cat)', gender: 'male' },
  { id: 'male79', name: 'Dan Gheesling', gender: 'male' },
  { id: 'male80', name: 'Tonetta', gender: 'male' },
  { id: 'male81', name: 'Lloyd Kaufman', gender: 'male' },
  { id: 'male82', name: 'Daxflame', gender: 'male' },
  { id: 'male83', name: 'Nick Nightmind', gender: 'male' },
  { id: 'male84', name: 'Russ Frushtick', gender: 'male' },
  { id: 'male85', name: 'Meat Canyon', gender: 'male' },
  { id: 'male86', name: 'Douglas Philippa', gender: 'male' },
  { id: 'male87', name: 'Douglas Philippa', gender: 'male' },
  { id: 'male88', name: 'Jonathan Holmes', gender: 'male' },
  { id: 'male89', name: 'Jonathan Holmes (old man)', gender: 'male' },
  { id: 'male90', name: 'Jonathan Holmes (satchmo)', gender: 'male' },
  { id: 'male91', name: 'The-Vinh Truong', gender: 'male' },
  { id: 'male92', name: 'Bobcat Goldthwait', gender: 'male' },
  { id: 'male93', name: 'Nik (Serbian cat - LeatherIceCream)', gender: 'male' },
  { id: 'male94', name: 'Jay Bauman (speaks) (swears)', gender: 'male' },
  { id: 'male95', name: 'Matan Evan', gender: 'male' },
  { id: 'male96', name: 'Alex Hicks', gender: 'male' },
  { id: 'male97', name: 'Mike Stoklasa', gender: 'male' },
  { id: 'male98', name: 'Corpse Husband', gender: 'male' },
  { id: 'male99', name: 'Will Stamper', gender: 'male' },
  { id: 'male100', name: 'Northern Lion', gender: 'male' },
  { id: 'male101', name: 'Josh Robert Thompson (George Lucas imitation) (speaks)', gender: 'male' },
  { id: 'male102', name: 'Justin Whang', gender: 'male' },
  { id: 'male103', name: 'Justin Whang ver 2', gender: 'male' },
  { id: 'male105', name: 'Jamishio', gender: 'male' },
  { id: 'male106', name: 'Burt Bronx', gender: 'male' },
  { id: 'male107', name: 'Greg Sestero (speaks)', gender: 'male' },
  { id: 'male108', name: 'MoistCr1tikal', gender: 'male' },
  { id: 'male109', name: 'Jerma (sounds like a cat)', gender: 'male' },
  { id: 'male110', name: 'Juan Moore', gender: 'male' },
  { id: 'male111', name: 'Gene Ween', gender: 'male' },
  { id: 'male112', name: 'Will Stamper (reversed)', gender: 'male' },
  { id: 'male113', name: 'Rodney Roy', gender: 'male' },
  { id: 'male114', name: 'Josh Robert Thompson (Morgan Freeman imitation) (speaks)', gender: 'male' },
  { id: 'female1', name: 'Danielle', gender: 'female' },
  { id: 'female2', name: 'Female 2', gender: 'female' },
  { id: 'female3', name: 'Carla', gender: 'female' },
  { id: 'female4', name: 'Lisa Kuras', gender: 'female' },
  { id: 'female5', name: 'Elicia Roy', gender: 'female' },
  { id: 'female6', name: 'Kaitlyn Lindquist', gender: 'female' },
  { id: 'female7', name: 'Audrina (young)', gender: 'female' },
  { id: 'female8', name: 'Audrina (young)', gender: 'female' },
  { id: 'female9', name: 'Selena', gender: 'female' },
  { id: 'female10', name: 'Selena', gender: 'female' },
  { id: 'female11', name: 'Alluux', gender: 'female' },
  { id: 'female12', name: 'Lauren Bleszinski', gender: 'female' },
  { id: 'female13', name: 'Giwi', gender: 'female' },
  { id: 'female14', name: 'Tikara the Mew', gender: 'female' },
  { id: 'female15', name: 'Cupquake', gender: 'female' },
  { id: 'female16', name: 'Sushimew (speaks)', gender: 'female' },
  { id: 'female17', name: 'Peachy (young)', gender: 'female' },
  { id: 'female18', name: 'Acacia', gender: 'female' },
  { id: 'female19', name: 'Chelsea Rebecca', gender: 'female' },
  { id: 'female20', name: 'Chelsea Rebecca', gender: 'female' },
  { id: 'female21', name: 'Emily Gordon', gender: 'female' },
  { id: 'female22', name: 'Felicia', gender: 'female' },
  { id: 'female23', name: 'Sydney Miles', gender: 'female' },
  { id: 'female24', name: 'Sydney Miles', gender: 'female' },
  { id: 'female25', name: 'Sydney Miles (speaks)', gender: 'female' },
  { id: 'female26', name: 'Sydney Miles', gender: 'female' },
  { id: 'female27', name: 'Sydney Miles (speaks)', gender: 'female' },
  { id: 'female28', name: 'Skye Manley', gender: 'female' },
  { id: 'female29', name: 'Crystal', gender: 'female' },
  { id: 'female30', name: 'Peach (normal) (young) (speaks)', gender: 'female' },
  { id: 'female31', name: 'Hila (from H3H)', gender: 'female' },
  { id: 'female32', name: 'Kris Kling', gender: 'female' },
  { id: 'female33', name: 'Barbara Laliberte', gender: 'female' },
  { id: 'female34', name: 'Marguerite Perrin (God Warrior) (speaks)', gender: 'female' },
  { id: 'female35', name: 'Chris Chan Sonichu Prime', gender: 'female' },
  { id: 'female36', name: 'Dani Bowman', gender: 'female' },
  { id: 'female37', name: 'Barbara Crampton (human)', gender: 'female' },
  { id: 'female38', name: 'Barbara Crampton (cat)', gender: 'female' },
  { id: 'female39', name: 'Lily Pichu', gender: 'female' },
  { id: 'female40', name: 'Nicole Barille (speaks)', gender: 'female' },
  { id: 'female41', name: 'Stephanie Sterling', gender: 'female' },
  { id: 'female42', name: 'Anisa', gender: 'female' },
  { id: 'female43', name: 'Mini (young)', gender: 'female' },
  { id: 'female44', name: 'Jonathan Holmes (impersonating his mother) (speaks)', gender: 'female' },
  { id: 'female45', name: 'Ali Glaiel', gender: 'female' },
  { id: 'female46', name: 'Ali Glaiel', gender: 'female' },
  { id: 'female47', name: 'Isabella Scobie', gender: 'female' },
  { id: 'female48', name: 'Brittney V', gender: 'female' },
  { id: 'female49', name: 'Brittney V', gender: 'female' },
  { id: 'female50', name: 'Brandi Corbett', gender: 'female' },
  { id: 'female51', name: 'Brandi Corbett', gender: 'female' },
  { id: 'female52', name: 'Gloria Howell', gender: 'female' },
  { id: 'female53', name: 'Shannon Shaw (speaks)', gender: 'female' },
  { id: 'female54', name: 'Shannon Shaw', gender: 'female' },
  { id: 'female55', name: 'Sheep Xing (Josie) (speaks)', gender: 'female' },
  { id: 'female56', name: 'Kezia Burrows', gender: 'female' },
  { id: 'female57', name: 'Kezia Burrows', gender: 'female' },
  { id: 'female58', name: 'Emiru', gender: 'female' },
  { id: 'female59', name: 'Zoe Thorogood', gender: 'female' },
  { id: 'robotom', name: 'Robotom (robot voice)', gender: 'other' },
  { id: 'spidercat', name: 'Spidercat (kitten)', gender: 'other' },
  { id: 'terminator', name: 'Josh Robert Thompson (speaks)', gender: 'other' },
];

interface BasePacksPanelProps {
  mutedBasePacks: string[];
  onToggleMute: (packId: string) => void;
}

export default function BasePacksPanel({
  mutedBasePacks,
  onToggleMute,
}: BasePacksPanelProps) {
  const [filter, setFilter] = useState<'all' | 'male' | 'female' | 'other'>('all');
  const [search, setSearch] = useState('');

  const filtered = BASE_PACKS.filter((pack) => {
    if (filter !== 'all' && pack.gender !== filter) return false;
    if (search && !pack.name.toLowerCase().includes(search.toLowerCase()) && !pack.id.includes(search.toLowerCase())) return false;
    return true;
  });

  const mutedCount = mutedBasePacks.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Base Game Voices</h2>
          <p className="text-sm text-mew-muted mt-1">
            {BASE_PACKS.length} voices total
            {mutedCount > 0 && (
              <span className="text-red-400/80 ml-2">
                ({mutedCount} muted)
              </span>
            )}
          </p>
        </div>
      </div>

      <p className="text-xs text-mew-muted/60 mb-4">
        Mute base game voices to prevent them from spawning. Muted voices will be set to weight 0 in the patch.
      </p>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search voices..."
          className="flex-1 px-3 py-1.5 text-sm bg-mew-bg border border-mew-highlight/50 rounded"
        />
        <div className="flex gap-1">
          {(['all', 'male', 'female', 'other'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                filter === f
                  ? 'bg-mew-accent text-white'
                  : 'bg-mew-surface border border-mew-highlight/50 text-mew-muted hover:bg-mew-highlight/30'
              }`}
            >
              {f === 'all' ? 'All' : f === 'male' ? 'Male' : f === 'female' ? 'Female' : 'Other'}
            </button>
          ))}
        </div>
      </div>

      {/* Pack list */}
<div className="space-y-1 h-full overflow-y-auto">
        {filtered.map((pack) => {
          const isMuted = mutedBasePacks.includes(pack.id);
          return (
            <div
              key={pack.id}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors ${
                isMuted
                  ? 'bg-red-900/10 border-red-700/20 opacity-60'
                  : 'bg-mew-surface border-mew-highlight/20'
              }`}
            >
              <button
                onClick={() => onToggleMute(pack.id)}
                className={`w-10 h-5 rounded-full relative transition-colors flex-shrink-0 ${
                  !isMuted ? 'bg-mew-accent' : 'bg-mew-surface'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    !isMuted ? 'left-5' : 'left-0.5'
                  }`}
                />
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium truncate ${isMuted ? 'line-through' : ''}`}>
                    {pack.name}
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-mew-highlight/40 text-mew-muted flex-shrink-0">
                    {pack.gender === 'female' ? 'F' : pack.gender === 'male' ? 'M' : '?'}
                  </span>
                </div>
                <p className="text-xs text-mew-muted/50">{pack.id}</p>
              </div>

              {isMuted && (
                <span className="text-xs text-red-400/60 flex-shrink-0">Muted</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
