-- ============================================================
-- 加 eyebrows + headband 到 generate_random_look() / generate_random_coach_look()
--   球員：60% 有眉毛、5% 有頭巾
--   教練：80% 有眉毛、10% 有頭巾
-- ============================================================

CREATE OR REPLACE FUNCTION generate_random_look()
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
  v_bodies      TEXT[] := ARRAY['light','olive','amber','brown','bronze'];
  v_eyes        TEXT[] := ARRAY['blue','brown','gray','green'];
  v_hair_styles TEXT[] := ARRAY[
    'messy1','messy2','spiked','plain','bangs','bangslong','pixie','shorthawk',
    'wavy','swoop','high_and_tight','mop','flat_top_fade','long_messy',
    'curly_long','bedhead','afro','dreadlocks_long','buzzcut','bedhead','long'
  ];
  v_hair_colors TEXT[] := ARRAY['black','blonde','red','white','ginger','gray'];
  v_beards      TEXT[] := ARRAY['5oclock_shadow','basic','medium','trimmed'];
  v_mustaches   TEXT[] := ARRAY['basic','handlebar','walrus','chevron'];
  v_eyebrow_st  TEXT[] := ARRAY['thick','thin'];
  v_headbands   TEXT[] := ARRAY['red','blue','black','white','green','yellow','purple'];
  v_hair_color  TEXT;
  v_hair_style  TEXT;
  v_beard       TEXT := 'none';
  v_mustache    TEXT := 'none';
  v_wrinkles    TEXT := 'none';
  v_eyebrow     TEXT := 'none';
  v_headband    TEXT := 'none';
BEGIN
  IF random() < 0.05 THEN v_hair_style := 'bald';
  ELSE v_hair_style := v_hair_styles[1 + floor(random() * array_length(v_hair_styles,1))];
  END IF;
  v_hair_color := v_hair_colors[1 + floor(random() * array_length(v_hair_colors,1))];

  IF random() < 0.1 THEN v_beard := v_beards[1 + floor(random() * array_length(v_beards,1))]; END IF;
  IF random() < 0.05 THEN v_mustache := v_mustaches[1 + floor(random() * array_length(v_mustaches,1))]; END IF;
  IF random() < 0.1 THEN v_wrinkles := 'on'; END IF;
  IF random() < 0.6 THEN v_eyebrow := v_eyebrow_st[1 + floor(random() * array_length(v_eyebrow_st,1))]; END IF;
  IF random() < 0.05 THEN v_headband := v_headbands[1 + floor(random() * array_length(v_headbands,1))]; END IF;

  RETURN jsonb_build_object(
    'body',           v_bodies[1 + floor(random() * array_length(v_bodies,1))],
    'eye_color',      v_eyes[1 + floor(random() * array_length(v_eyes,1))],
    'wrinkles',       v_wrinkles,
    'hair_style',     v_hair_style,
    'hair_color',     v_hair_color,
    'eyebrow_style',  v_eyebrow,
    'eyebrow_color',  v_hair_color,   -- 跟髮色一致
    'beard_style',    v_beard,
    'mustache_style', v_mustache,
    'beard_color',    v_hair_color,
    'headband_color', v_headband
  );
END;
$$;


CREATE OR REPLACE FUNCTION generate_random_coach_look()
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
  v_bodies      TEXT[] := ARRAY['light','olive','amber','brown','bronze'];
  v_eyes        TEXT[] := ARRAY['blue','brown','gray','green'];
  v_hair_styles TEXT[] := ARRAY[
    'plain','plain','swoop','swoop','high_and_tight',
    'buzzcut','balding','balding','wavy','bedhead','spiked','curly_long'
  ];
  v_hair_colors TEXT[] := ARRAY['black','blonde','gray','white','ginger'];
  v_beards      TEXT[] := ARRAY['5oclock_shadow','basic','medium','trimmed'];
  v_eyebrow_st  TEXT[] := ARRAY['thick','thin'];
  v_headbands   TEXT[] := ARRAY['red','blue','black','white','green'];
  v_hair_color  TEXT;
  v_hair_style  TEXT;
BEGIN
  v_hair_style := v_hair_styles[1 + floor(random() * array_length(v_hair_styles,1))];
  v_hair_color := v_hair_colors[1 + floor(random() * array_length(v_hair_colors,1))];

  RETURN jsonb_build_object(
    'body',           v_bodies[1 + floor(random() * array_length(v_bodies,1))],
    'eye_color',      v_eyes[1 + floor(random() * array_length(v_eyes,1))],
    'wrinkles',       CASE WHEN random() < 0.5 THEN 'on' ELSE 'none' END,
    'hair_style',     v_hair_style,
    'hair_color',     v_hair_color,
    'eyebrow_style',  CASE WHEN random() < 0.8 THEN v_eyebrow_st[1 + floor(random() * array_length(v_eyebrow_st,1))] ELSE 'none' END,
    'eyebrow_color',  v_hair_color,
    'beard_style',    CASE WHEN random() < 0.6 THEN v_beards[1 + floor(random() * array_length(v_beards,1))] ELSE 'none' END,
    'mustache_style', 'none',
    'beard_color',    v_hair_color,
    'headband_color', CASE WHEN random() < 0.1 THEN v_headbands[1 + floor(random() * array_length(v_headbands,1))] ELSE 'none' END
  );
END;
$$;
