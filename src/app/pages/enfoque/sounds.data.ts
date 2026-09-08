export interface BackgroundSoundOption {
  id: string;
  name: string;
  category: 'natural' | 'urbano' | 'reloj' | 'sintetico';
  type: 'file' | 'ticking' | 'synth';
  file?: string;
  files?: string[];
  icon?: string;
}

export interface EndSessionSoundOption {
  id: string;
  name: string;
  file: string;
  icon?: string;
}

export const BACKGROUND_SOUNDS: BackgroundSoundOption[] = [
  // Silencio
  { id: 'off', name: 'Silencio (Off)', category: 'sintetico', type: 'synth', icon: 'fa-volume-xmark' },

  // Naturaleza & Clima (Grabaciones reales HQ)
  { id: 'amazon_forest', name: 'Amazon Forest River', category: 'natural', type: 'file', file: 'rofocus-amazon-forest-river.m4a', icon: 'fa-tree' },
  { id: 'beach', name: 'Beach', category: 'natural', type: 'file', file: 'rofocus-beach.m4a', icon: 'fa-umbrella-beach' },
  { id: 'new_beach', name: 'New Beach', category: 'natural', type: 'file', file: 'rofocus-new-beach.mp3', icon: 'fa-water' },
  { id: 'campfire', name: 'Campfire', category: 'natural', type: 'file', file: 'rofocus-campfire.m4a', icon: 'fa-fire' },
  { id: 'dusk_woods', name: 'Dusk Woods', category: 'natural', type: 'file', file: 'rofocus-dusk-woods.m4a', icon: 'fa-campground' },
  { id: 'new_dusk_woods', name: 'New Dusk in the Woods', category: 'natural', type: 'file', file: 'rofocus-new-dusk-in-the-woods-long.mp3', icon: 'fa-feather' },
  { id: 'morning_birds', name: 'Morning Birds', category: 'natural', type: 'file', file: 'rofocus-morning-birds.m4a', icon: 'fa-dove' },
  { id: 'rainy_mountains', name: 'Rainy Mountains', category: 'natural', type: 'file', file: 'rofocus-rainy-mountains.m4a', icon: 'fa-cloud-showers-heavy' },
  { id: 'waves', name: 'Waves', category: 'natural', type: 'file', file: 'rofocus-new-waves.mp3', icon: 'fa-water' },
  { id: 'underwater', name: 'Underwater', category: 'natural', type: 'file', file: 'rofocus-underwater.m4a', icon: 'fa-fish' },
  { id: 'natural_wind', name: 'Natural Wind', category: 'natural', type: 'file', file: 'rofocus-natural-wind.m4a', icon: 'fa-wind' },
  { id: 'natural_wind_heavy', name: 'Natural Wind Heavy', category: 'natural', type: 'file', file: 'rofocus-natural-wind-heavy.m4a', icon: 'fa-wind' },
  { id: 'normal_wind', name: 'Normal Wind', category: 'natural', type: 'file', file: 'rofocus-normal-wind.m4a', icon: 'fa-wind' },
  { id: 'real_wind', name: 'Real Wind', category: 'natural', type: 'file', file: 'rofocus-real-wind.m4a', icon: 'fa-wind' },
  { id: 'stormy_wind', name: 'Stormy Wind', category: 'natural', type: 'file', file: 'rofocus-stormy-wind.m4a', icon: 'fa-tornado' },
  { id: 'calm_village', name: 'Calm Village', category: 'natural', type: 'file', file: 'rofocus-new-calm-village.mp3', icon: 'fa-mountain-sun' },
  { id: 'experimental_nature', name: 'Experimental Nature', category: 'natural', type: 'file', file: 'rofocus-new-experimental-nature.mp3', icon: 'fa-seedling' },
  { id: 'park_by_river', name: 'Park by the River', category: 'natural', type: 'file', file: 'rofocus-new-park-by-the-river.mp3', icon: 'fa-leaf' },
  { id: 'floating_space', name: 'Floating Space', category: 'natural', type: 'file', file: 'rofocus-new-floating-space.mp3', icon: 'fa-satellite' },
  { id: 'exotic_calm', name: 'Exotic Calm', category: 'natural', type: 'file', file: 'rofocus-exotic-calm.m4a', icon: 'fa-spa' },

  // Cafeterías & Urbano (Grabaciones reales HQ)
  { id: 'coffee_shop', name: 'Coffee Shop', category: 'urbano', type: 'file', file: 'rofocus-coffee-shop.m4a', icon: 'fa-mug-hot' },
  { id: 'new_coffee_shop', name: 'New Coffee Shop', category: 'urbano', type: 'file', file: 'rofocus-new-coffee-shop.mp3', icon: 'fa-coffee' },
  { id: 'college_campus_cafe', name: 'College Campus Cafe', category: 'urbano', type: 'file', file: 'rofocus-college-campus-cafe.m4a', icon: 'fa-graduation-cap' },
  { id: 'rome_restaurant', name: 'Rome Restaurant', category: 'urbano', type: 'file', file: 'rofocus-rome-restaurant.m4a', icon: 'fa-utensils' },
  { id: 'berlin_city_center', name: 'Berlin City Center', category: 'urbano', type: 'file', file: 'rofocus-berlin-city-center.m4a', icon: 'fa-city' },
  { id: 'busy_central_london', name: 'Busy Central London', category: 'urbano', type: 'file', file: 'rofocus-busy-central-london.m4a', icon: 'fa-building' },
  { id: 'bruges_students', name: 'Bruges Students', category: 'urbano', type: 'file', file: 'rofocus-bruges-students.m4a', icon: 'fa-users' },
  { id: 'copenhagen_outdoors', name: 'Copenhagen Outdoors', category: 'urbano', type: 'file', file: 'rofocus-copenhagen-outdoors.m4a', icon: 'fa-sun' },
  { id: 'quiet_city_athens', name: 'Quiet City (Athens)', category: 'urbano', type: 'file', file: 'rofocus-new-quiet-city-vibes-athens-greece-quiet.mp3', icon: 'fa-landmark' },
  { id: 'quiet_city_vibes', name: 'Quiet City Vibes', category: 'urbano', type: 'file', file: 'rofocus-new-quiet-city-vibes.mp3', icon: 'fa-street-view' },

  // Tic-Tac & Relojes (Sonidos Rítmicos HQ)
  { id: 'stopwatch', name: 'Stopwatch', category: 'reloj', type: 'ticking', files: ['4cf03078.mp3', 'edab7b0d.mp3'], icon: 'fa-stopwatch' },
  { id: 'wristwatch', name: 'Wristwatch', category: 'reloj', type: 'ticking', files: ['8dc834f8.mp3', '831a5549.mp3'], icon: 'fa-clock' },
  { id: 'clock', name: 'Clock', category: 'reloj', type: 'ticking', files: ['af607ff1.mp3', 'fd23aaf3.mp3'], icon: 'fa-clock' },
  { id: 'wall_clock', name: 'Wall Clock', category: 'reloj', type: 'ticking', files: ['6103cd58.mp3', 'cad167ea.mp3'], icon: 'fa-clock' },
  { id: 'desk_clock', name: 'Desk Clock', category: 'reloj', type: 'ticking', files: ['6a981bfc.mp3', 'fd64de98.mp3'], icon: 'fa-table' },
  { id: 'wind_up_clock', name: 'Wind-up Clock', category: 'reloj', type: 'ticking', files: ['bc4e3db2.mp3', 'f9efd11b.mp3'], icon: 'fa-gear' },
  { id: 'antique_clock', name: 'Antique Clock', category: 'reloj', type: 'ticking', files: ['875326f9.mp3', 'cba5f173.mp3'], icon: 'fa-hourglass' },
  { id: 'small_clock', name: 'Small Clock', category: 'reloj', type: 'ticking', files: ['89dafd3e.mp3', '0a0ec499.mp3'], icon: 'fa-bell' },
  { id: 'large_clock', name: 'Large Clock', category: 'reloj', type: 'ticking', files: ['2122d2a4.mp3', 'a273ba0c.mp3'], icon: 'fa-bell' },
  { id: 'wood_block', name: 'Wood Block', category: 'reloj', type: 'ticking', files: ['ad6eac9e.mp3'], icon: 'fa-cubes' },
  { id: 'metronome', name: 'Metronome', category: 'reloj', type: 'ticking', files: ['bced7c21.mp3', '9bd67f7e.mp3'], icon: 'fa-drum' },
  { id: 'pulse', name: 'Pulse', category: 'reloj', type: 'ticking', files: ['fe5d2a62.mp3'], icon: 'fa-heart-pulse' },

  // Sintéticos Zen (Web Audio API)
  { id: 'reloj_digital', name: 'Reloj Digital', category: 'sintetico', type: 'synth', icon: 'fa-digital-tachograph' },
  { id: 'ruido_rosa', name: 'Ruido Rosa', category: 'sintetico', type: 'synth', icon: 'fa-wave-square' },
  { id: 'teclado', name: 'Teclado ASMR', category: 'sintetico', type: 'synth', icon: 'fa-keyboard' },
  { id: 'cafe', name: 'Ruido Café', category: 'sintetico', type: 'synth', icon: 'fa-sliders' },
  { id: 'lluvia', name: 'Lluvia Zen', category: 'sintetico', type: 'synth', icon: 'fa-cloud-rain' },
  { id: 'fogata', name: 'Fogata Zen', category: 'sintetico', type: 'synth', icon: 'fa-fire-burner' },
  { id: 'bosque', name: 'Bosque Zen', category: 'sintetico', type: 'synth', icon: 'fa-tree' },
  { id: 'olas', name: 'Olas Zen', category: 'sintetico', type: 'synth', icon: 'fa-water' },
  { id: 'viento', name: 'Brisa Zen', category: 'sintetico', type: 'synth', icon: 'fa-wind' }
];

export const END_SESSION_SOUNDS: EndSessionSoundOption[] = [
  { id: 'tone', name: 'Tone', file: 'f62b45bc.mp3', icon: 'fa-music' },
  { id: 'digital_watch', name: 'Digital Watch', file: 'be75f155.mp3', icon: 'fa-stopwatch' },
  { id: 'analog_alarm_clock', name: 'Analog Alarm Clock', file: '0f034826.mp3', icon: 'fa-clock' },
  { id: 'digital_alarm_clock', name: 'Digital Alarm Clock', file: 'fee369b7.mp3', icon: 'fa-bell' },
  { id: 'electronic_chime', name: 'Electronic Chime', file: '28d6b5be.mp3', icon: 'fa-sparkles' },
  { id: 'bell_ring', name: 'Bell Ring', file: 'b10d75f2.mp3', icon: 'fa-bell' },
  { id: 'ding', name: 'Ding', file: '1a5066bd.mp3', icon: 'fa-bullhorn' },
  { id: 'dong', name: 'Dong', file: '5e122cee.mp3', icon: 'fa-volume-high' },
  { id: 'ding_dong', name: 'Ding Dong', file: '92ff2a8a.mp3', icon: 'fa-door-open' },
  { id: 'gong_1', name: 'Gong 1', file: '8bce59b5.mp3', icon: 'fa-circle-notch' },
  { id: 'gong_2', name: 'Gong 2', file: '85cab25d.mp3', icon: 'fa-circle-dot' },
  { id: 'computer_magic', name: 'Computer Magic', file: '5cf807ce.mp3', icon: 'fa-wand-magic-sparkles' },
  { id: 'fire_pager', name: 'Fire Pager', file: 'b38e515f.mp3', icon: 'fa-fire-extinguisher' },
  { id: 'glass_ping', name: 'Glass Ping', file: '2ed9509e.mp3', icon: 'fa-wine-glass' },
  { id: 'music_box', name: 'Music Box', file: 'ebe7deb8.mp3', icon: 'fa-gift' },
  { id: 'pin_drop', name: 'Pin Drop', file: '2e13802a.mp3', icon: 'fa-thumbtack' },
  { id: 'robot_blip_1', name: 'Robot Blip 1', file: 'bd50add0.mp3', icon: 'fa-robot' },
  { id: 'robot_blip_2', name: 'Robot Blip 2', file: '36e93c27.mp3', icon: 'fa-microchip' },
  { id: 'ship_bell', name: 'Ship Bell', file: '9404f598.mp3', icon: 'fa-ship' },
  { id: 'train_horn', name: 'Train Horn', file: '6a215611.mp3', icon: 'fa-train' },
  { id: 'bike_horn', name: 'Bike Horn', file: '72312dd3.mp3', icon: 'fa-bicycle' },
  { id: 'reception_bell', name: 'Reception Bell', file: '54b867f9.mp3', icon: 'fa-concierge-bell' },
  { id: 'toaster_oven', name: 'Toaster Oven', file: 'a258e906.mp3', icon: 'fa-bread-slice' },
  { id: 'battle_horn', name: 'Battle Horn', file: '88736c22.mp3', icon: 'fa-shield-halved' },
  { id: 'airplane', name: 'Airplane', file: '72cb1b7f.mp3', icon: 'fa-plane' }
];
