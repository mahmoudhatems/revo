#!/usr/bin/env python3
"""Procedural chiptune SFX + ambience synth for REVO (offline, deterministic)."""
import os
import wave
import numpy as np

SR = 44100
OUT = "/home/ubuntu/revo-audio/sfx-master"

def env(n, a, r, hold=0.3):
    a = max(1, int(a * SR)); r = max(1, int(r * SR))
    if a + r >= n:
        return np.ones(n)
    e = np.ones(n)
    e[:a] = np.linspace(0, 1, a)
    tail = np.hanning(2 * r)[:r]
    e[-r:] = tail * (np.linspace(1, hold, r) > 0)
    e[a:-r] = np.maximum(e[a:-r], hold)
    # simple ADSR-ish: linear attack, hold at 1, hanning release
    e = np.ones(n); e[:a] = np.linspace(0, 1, a); e[-r:] = np.hanning(2 * r)[:r]
    return e

def conv(a, b):
    return np.convolve(a, b)[: len(a)]

def lp(x, cut):
    k = np.hanning(max(3, int(SR / cut)))
    y = conv(x, k / k.sum())
    return y

def bp(x, f, q):
    xf = np.fft.rfft(x)
    fr = np.fft.rfftfreq(len(x), 1 / SR)
    w = np.exp(-((fr - f) ** 2) / (2 * q ** 2))
    return np.fft.irfft(xf * w, len(x))

def fade_loop(x, n):
    if len(x) <= 2 * n:
        return x
    f = np.linspace(0.0, 1.0, n)
    blend = x[-n:] * f + x[:n] * (1.0 - f)
    return np.concatenate([blend, x[n:-n]])

def write_wav(path, x, peak=0.95):
    x = np.asarray(x, dtype=float)
    if len(x) < 2:
        return
    mx = np.max(np.abs(x))
    if mx > 0:
        x = x / mx * peak
    data = (x * 32767).astype(np.int16)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(data.tobytes())

def note(t):
    """t: list of segments; each segment dict(kind,f,d,v,g,slide,f2,buzz,decay,harm)"""
    CAP = 8 * SR
    out = np.zeros(CAP)
    pos = 0
    for seg in t:
        dur = seg.get("d", 0.1)
        n = int(dur * SR)
        f = seg.get("f", 440)
        v = seg.get("v", 0.5)
        kind = seg.get("kind", "sq")
        harm = seg.get("harm", 1)
        ts = np.arange(n) / SR
        if "slide" in seg or "f2" in seg:
            f2 = seg.get("f2", f * seg.get("slide", 1))
            freqs = np.geomspace(f, f2, n)
            ph = np.cumsum(freqs) / SR
        else:
            ph = f * ts
        if kind == "sq":
            x = sum(np.sin(2 * np.pi * ph * k) / k for k in range(1, harm, 2))
            x /= 1.0
        elif kind == "saw":
            x = sum(np.sin(2 * np.pi * ph * k) / k for k in range(1, harm))
        elif kind == "tri":
            x = sum((-1) ** ((k - 1) // 2) * np.sin(2 * np.pi * ph * k) / (k * k) for k in range(1, harm, 2)) * 8 / np.pi ** 2
        elif kind == "sine":
            x = np.sin(2 * np.pi * ph)
        elif kind == "sine_sub":
            x = np.sin(2 * np.pi * ph * 0.5) + 0.4 * np.sin(2 * np.pi * ph)
        elif kind == "crackle":
            x = np.random.randn(n) * np.exp(-ts * seg.get("decay", 40))
            x = lp(x, 4000)
        elif kind == "noise":
            x = lp(np.random.randn(n), seg.get("harm", 2000))
        elif kind == "wind":
            x = lp(np.random.randn(n), 800)
        elif kind == "heart":
            base = np.sin(2 * np.pi * 55 * ts)
            x = base * np.exp(-((ts % 0.5) * 10))
        if seg.get("buzz"):
            x = x * (0.6 + 0.4 * np.sin(2 * np.pi * seg["buzz"] * ts))
        atk = seg.get("a", 0.004)
        rel = seg.get("r", 0.01)
        e = env(n, atk, rel, 1.0 if dur < 0.3 else 0.12)
        seg_x = x * e * v
        end = min(pos + n, CAP)
        if end > pos:
            out[pos:end] += seg_x[: end - pos]
        pos += int(dur * SR)
        if pos >= CAP:
            break
    return out[:min(pos, CAP)]


def seq(notes_, gap=0.0):
    CAP = 8 * SR
    out = np.zeros(CAP)
    pos = 0
    for nn in notes_:
        x = note([nn])
        end = min(pos + len(x), CAP)
        if end > pos:
            out[pos:end] += x[: end - pos]
        pos += len(x) + int(gap * SR)
        if pos >= CAP:
            break
    return out[: min(pos, CAP)]


RECIPES = {
    # ---- UI ----
    "ui_click": [lambda: note([dict(kind="sq", f=880, f2=660, d=0.035, v=0.35, harm=13)])],
    "ui_select": [lambda: note([dict(kind="sq", f=660, d=0.03, v=0.3, harm=13)]),
                  lambda: note([dict(kind="sq", f=990, d=0.05, v=0.3, harm=13)])],
    "ui_confirm": [lambda: note([dict(kind="tri", f=523, f2=784, d=0.09, v=0.4, harm=9)]),
                   lambda: note([dict(kind="tri", f=784, d=0.09, v=0.35, harm=9)])],
    "ui_back": [lambda: note([dict(kind="sq", f=440, f2=290, d=0.09, v=0.3, harm=11)])],
    "ui_locked": [lambda: note([dict(kind="sq", f=150, d=0.09, v=0.4, harm=21, buzz=24)]),
                  lambda: note([dict(kind="sq", f=120, d=0.11, v=0.4, harm=21, buzz=18)])],
    "ui_panel_open": [lambda: note([dict(kind="noise", harm=3500, d=0.16, v=0.18, r=0.1)]),
                      lambda: note([dict(kind="sine", f=500, f2=1200, d=0.1, v=0.2)])],
    "ui_panel_close": [lambda: note([dict(kind="noise", harm=2000, d=0.14, v=0.14, r=0.1)]),
                       lambda: note([dict(kind="sine", f=1200, f2=400, d=0.1, v=0.15)])],
    "ui_hover": [lambda: note([dict(kind="sine", f=1500, d=0.02, v=0.07)])],
    "ui_tab": [lambda: note([dict(kind="sq", f=1320, d=0.03, v=0.2, harm=9)])],
    "ui_page_turn": [lambda: note([dict(kind="noise", harm=5000, d=0.18, v=0.12, r=0.12)])],
    # ---- resources (two-variant sets: *_a / *_b) ----
    "meter_power_a": [lambda: note([dict(kind="saw", f=330, f2=660, d=0.16, v=0.3, harm=16)]),
                      lambda: note([dict(kind="sine", f=880, d=0.08, v=0.2)])],
    "meter_power_b": [lambda: note([dict(kind="saw", f=660, f2=330, d=0.18, v=0.28, harm=16)])],
    "meter_water_a": [lambda: note([dict(kind="sine", f=700, f2=500, d=0.07, v=0.3)]),
                      lambda: note([dict(kind="sine", f=900, f2=650, d=0.07, v=0.25)]),
                      lambda: note([dict(kind="sine", f=1100, d=0.06, v=0.2)])],
    "meter_water_b": [lambda: note([dict(kind="sine", f=500, f2=300, d=0.12, v=0.3)]),
                      lambda: note([dict(kind="noise", harm=900, d=0.08, v=0.1)])],
    "meter_oxygen_a": [lambda: note([dict(kind="sine", f=520, f2=1040, d=0.2, v=0.25)]),
                       lambda: note([dict(kind="noise", harm=6000, d=0.12, v=0.06)])],
    "meter_oxygen_b": [lambda: note([dict(kind="noise", harm=3000, d=0.25, v=0.12, r=0.2)]),
                       lambda: note([dict(kind="sine", f=400, f2=250, d=0.12, v=0.15)])],
    "meter_shield_a": [lambda: seq([dict(kind="sine", f=659, d=0.1, v=0.25), dict(kind="sine", f=988, d=0.12, v=0.25)]),
                       lambda: note([dict(kind="sine", f=1319, d=0.1, v=0.2)])],
    "meter_shield_b": [lambda: note([dict(kind="sine", f=300, f2=180, d=0.15, v=0.3)]),
                       lambda: note([dict(kind="sine", f=392, f2=300, d=0.18, v=0.12)])],
    "meter_heart_a": [lambda: note([dict(kind="sine", f=740, f2=1110, d=0.16, v=0.28)]),
                      lambda: note([dict(kind="sine", f=1480, d=0.1, v=0.18)])],
    "meter_heart_b": [lambda: note([dict(kind="heart", d=0.5, v=0.5)]),
                      lambda: note([dict(kind="sine", f=370, f2=300, d=0.2, v=0.2)])],
    "meter_critical": [lambda: note([dict(kind="sq", f=880, d=0.12, v=0.3, harm=9)]),
                       lambda: note([dict(kind="sq", f=660, d=0.12, v=0.3, harm=9)]),
                       lambda: note([dict(kind="sq", f=880, d=0.12, v=0.3, harm=9)])],
    "meter_safe": [lambda: note([dict(kind="tri", f=587, d=0.08, v=0.25, harm=7)]),
                   lambda: note([dict(kind="tri", f=880, d=0.12, v=0.3, harm=7)])],
    # ---- gameplay ----
    "game_start": [lambda: seq([dict(kind="sq", f=392, d=0.09, v=0.3, harm=13), dict(kind="sq", f=523, d=0.09, v=0.3, harm=13), dict(kind="sq", f=659, d=0.09, v=0.3, harm=13), dict(kind="sq", f=784, d=0.16, v=0.35, harm=13)], gap=0.01)],
    "mission_complete": [lambda: seq([dict(kind="tri", f=523, d=0.1, v=0.3, harm=9), dict(kind="tri", f=659, d=0.1, v=0.3, harm=9), dict(kind="tri", f=784, d=0.1, v=0.3, harm=9), dict(kind="tri", f=1047, d=0.22, v=0.35, harm=9)], gap=0.02)],
    "task_start": [lambda: note([dict(kind="sq", f=1046, d=0.08, v=0.25, harm=11)]),
                   lambda: note([dict(kind="sq", f=1318, d=0.12, v=0.28, harm=11)])],
    "task_success": [lambda: note([dict(kind="sine", f=880, d=0.08, v=0.3)]),
                     lambda: note([dict(kind="sine", f=1174, d=0.08, v=0.3)]),
                     lambda: note([dict(kind="sine", f=1568, d=0.16, v=0.32)])],
    "task_error": [lambda: note([dict(kind="sine", f=523, d=0.1, v=0.25)]),
                   lambda: note([dict(kind="sine", f=415, d=0.16, v=0.25)])],
    "choice_confirm": [lambda: note([dict(kind="sine", f=300, f2=600, d=0.06, v=0.35)]),
                       lambda: note([dict(kind="tri", f=1245, d=0.08, v=0.28, harm=7)])],
    "countdown_tick": [lambda: note([dict(kind="sq", f=1000, d=0.025, v=0.18, harm=5)])],
    "countdown_tick_fast": [lambda: note([dict(kind="sq", f=1400, d=0.025, v=0.24, harm=5)])],
    "timeout": [lambda: note([dict(kind="saw", f=500, f2=180, d=0.5, v=0.3, harm=14)])],
    "sticker_get": [lambda: note([dict(kind="sine", f=1568, d=0.06, v=0.2)]),
                    lambda: note([dict(kind="sine", f=2093, d=0.06, v=0.2)]),
                    lambda: note([dict(kind="sine", f=2637, d=0.06, v=0.2)]),
                    lambda: seq([dict(kind="tri", f=1047, d=0.2, v=0.25, harm=9), dict(kind="noise", harm=8000, d=0.3, v=0.05)])],
    "reward_small": [lambda: note([dict(kind="tri", f=784, d=0.1, v=0.28, harm=9)]),
                     lambda: note([dict(kind="tri", f=1174, d=0.18, v=0.3, harm=9)])],
    "reward_special": [lambda: seq([dict(kind="sq", f=523, d=0.12, v=0.3, harm=15), dict(kind="sq", f=659, d=0.12, v=0.3, harm=15), dict(kind="sq", f=784, d=0.12, v=0.3, harm=15), dict(kind="sq", f=1047, d=0.3, v=0.35, harm=15), dict(kind="sine", f=1319, d=0.3, v=0.2)], gap=0.03)],
    "sparkle": [lambda: note([dict(kind="noise", harm=9000, d=0.2, v=0.06, r=0.15)]),
                lambda: note([dict(kind="sine", f=2637, d=0.08, v=0.12)]),
                lambda: note([dict(kind="sine", f=3520, d=0.08, v=0.1)])],
    # ---- minigame primitives ----
    "mech_click": [lambda: note([dict(kind="noise", harm=2500, d=0.03, v=0.3, r=0.01), ]),
                   lambda: note([dict(kind="sine", f=220, d=0.04, v=0.2)])],
    "mech_ratchet": [lambda: note([dict(kind="noise", harm=3000, d=0.02, v=0.25, r=0.01)]),
                     lambda: note([dict(kind="noise", harm=2600, d=0.02, v=0.2, r=0.01)]),
                     lambda: note([dict(kind="noise", harm=3200, d=0.02, v=0.22, r=0.01)])],
    "valve_turn": [lambda: note([dict(kind="noise", harm=1200, d=0.3, v=0.12, r=0.2)]),
                   lambda: note([dict(kind="sine", f=350, f2=600, d=0.15, v=0.15)])],
    "valve_squeak": [lambda: note([dict(kind="sine", f=1800, f2=2600, d=0.08, v=0.08)]),
                     lambda: note([dict(kind="sine", f=2400, f2=1600, d=0.08, v=0.06)])],
    "charge_hum": [lambda: note([dict(kind="saw", f=110, f2=440, d=1.4, v=0.22, harm=24, a=0.4)])],
    "water_flow": [lambda: note([dict(kind="noise", harm=1400, d=1.2, v=0.16, a=0.1, r=0.3)]),
                   lambda: note([dict(kind="noise", harm=2400, d=0.9, v=0.08, r=0.3)])],
    "water_drop": [lambda: note([dict(kind="sine", f=1200, f2=700, d=0.06, v=0.25)])],
    "air_pressure": [lambda: note([dict(kind="noise", harm=5000, d=0.35, v=0.14, a=0.15)]),
                     lambda: note([dict(kind="sine", f=90, d=0.1, v=0.3)])],
    "lock_click": [lambda: note([dict(kind="noise", harm=2000, d=0.02, v=0.3, r=0.005)]),
                    lambda: note([dict(kind="sq", f=560, d=0.06, v=0.25, harm=13)]),
                    lambda: note([dict(kind="sq", f=840, d=0.1, v=0.3, harm=13)])],
    "hold_complete": [lambda: note([dict(kind="sine", f=659, f2=988, d=0.14, v=0.3)]),
                      lambda: note([dict(kind="sine", f=1319, d=0.16, v=0.25)])],
    "tap_light": [lambda: note([dict(kind="sine", f=800, f2=600, d=0.04, v=0.2)])],
    "swipe_whoosh": [lambda: note([dict(kind="noise", harm=4000, d=0.22, v=0.14, a=0.08, r=0.15)])],
    "spin_roll": [lambda: note([dict(kind="sq", f=300, d=0.4, v=0.15, harm=9, buzz=18)]),
                  lambda: note([dict(kind="sq", f=400, d=0.4, v=0.15, harm=9, buzz=20)])],
    "fuse_toggle": [lambda: note([dict(kind="noise", harm=1800, d=0.025, v=0.3, r=0.01)]),
                    lambda: note([dict(kind="sq", f=180, d=0.05, v=0.25, harm=9)])],
    "fuse_connect": [lambda: note([dict(kind="sine", f=660, d=0.05, v=0.25)]),
                     lambda: note([dict(kind="crackle", d=0.1, v=0.2, decay=60)]),
                     lambda: note([dict(kind="sine", f=880, d=0.08, v=0.3)])],
    "fuse_hum": [lambda: note([dict(kind="saw", f=90, d=1.0, v=0.16, harm=6, a=0.2, r=0.25)])],
    # ---- events / emergencies ----
    "alert_soft": [lambda: note([dict(kind="sine", f=740, d=0.1, v=0.28)]),
                   lambda: note([dict(kind="sine", f=988, d=0.14, v=0.28)])],
    "alert_crisis": [lambda: note([dict(kind="sq", f=784, d=0.12, v=0.22, harm=7)]),
                     lambda: note([dict(kind="sq", f=622, d=0.12, v=0.22, harm=7)]),
                     lambda: note([dict(kind="sq", f=784, d=0.12, v=0.22, harm=7)])],
    "flare_swell": [lambda: note([dict(kind="sine", f=200, f2=1200, d=2.6, v=0.3, a=1.2, r=0.8)]),
                    lambda: note([dict(kind="sine", f=150, f2=900, d=2.6, v=0.2, a=1.4)])],
    "hatch_close": [lambda: note([dict(kind="sine", f=120, f2=60, d=0.35, v=0.4)]),
                    lambda: note([dict(kind="noise", harm=900, d=0.15, v=0.2, r=0.03)]),
                    lambda: note([dict(kind="sq", f=90, d=0.1, v=0.3, harm=5)])],
    "blackout": [lambda: note([dict(kind="saw", f=220, f2=35, d=1.1, v=0.35, harm=20)]),
                 lambda: note([dict(kind="sine", f=60, d=0.4, v=0.3, r=0.35)])],
    "power_restore": [lambda: note([dict(kind="saw", f=35, f2=220, d=0.8, v=0.3, harm=20, a=0.4)]),
                      lambda: note([dict(kind="sine", f=880, d=0.12, v=0.2)])],
    "spark_zap": [lambda: note([dict(kind="crackle", d=0.25, v=0.4, decay=25)]),
                  lambda: note([dict(kind="sine", f=2000, f2=300, d=0.15, v=0.2)])],
    "overload_zap": [lambda: note([dict(kind="crackle", d=0.4, v=0.5, decay=15)]),
                     lambda: note([dict(kind="saw", f=800, f2=100, d=0.3, v=0.3, harm=24)]),
                     lambda: note([dict(kind="sine", f=55, d=0.5, v=0.35, r=0.4)])],
    "fuse_reset": [lambda: note([dict(kind="noise", harm=1500, d=0.05, v=0.3)]),
                   lambda: note([dict(kind="sq", f=120, d=0.08, v=0.3, harm=9)]),
                   lambda: note([dict(kind="sine", f=660, d=0.08, v=0.2)])],
    "wind_gust": [lambda: note([dict(kind="wind", d=2.0, v=0.3, a=0.9, r=0.9)])],
    "gust_hard": [lambda: note([dict(kind="wind", d=1.2, v=0.45, a=0.2, r=0.7)])],
    # ---- radio / earth ----
    "radio_blip": [lambda: note([dict(kind="sine", f=1400, d=0.03, v=0.2)]),
                   lambda: note([dict(kind="sine", f=1800, d=0.03, v=0.2)])],
    "radio_call": [lambda: note([dict(kind="sq", f=880, d=0.07, v=0.18, harm=7)]),
                   lambda: note([dict(kind="noise", harm=3000, d=0.25, v=0.07, r=0.2)]),
                   lambda: note([dict(kind="sq", f=1174, d=0.07, v=0.18, harm=7)]),
                   lambda: note([dict(kind="sine", f=1400, f2=1800, d=0.3, v=0.2)])],
    "static_burst": [lambda: note([dict(kind="noise", harm=2500, d=0.5, v=0.18, a=0.05, r=0.3)])],
    # ---- rover ----
    "rover_power_on": [lambda: seq([dict(kind="sq", f=220, d=0.06, v=0.2, harm=13), dict(kind="sq", f=330, d=0.06, v=0.22, harm=13), dict(kind="sq", f=440, d=0.06, v=0.24, harm=13), dict(kind="sq", f=660, d=0.12, v=0.26, harm=13), dict(kind="saw", f=110, d=0.5, v=0.16, harm=10, a=0.05)], gap=0.01)],
    "rover_depart": [lambda: note([dict(kind="saw", f=60, f2=140, d=0.8, v=0.3, harm=12, a=0.3)]),
                     lambda: note([dict(kind="noise", harm=700, d=0.7, v=0.12, a=0.3)])],
    "rover_move_flat": [lambda: note([dict(kind="noise", harm=900, d=0.12, v=0.12, r=0.06)]),
                        lambda: note([dict(kind="sine", f=90, d=0.08, v=0.2)])],
    "rover_move_crater": [lambda: note([dict(kind="noise", harm=1400, d=0.2, v=0.2, r=0.1)]),
                          lambda: note([dict(kind="crackle", d=0.12, v=0.12, decay=30)]),
                          lambda: note([dict(kind="sine", f=70, d=0.1, v=0.25)])],
    "rover_move_ice": [lambda: note([dict(kind="noise", harm=4500, d=0.16, v=0.12, r=0.1)]),
                       lambda: note([dict(kind="sine", f=1600, f2=900, d=0.14, v=0.06)])],
    "rover_move_mountain": [lambda: note([dict(kind="saw", f=55, f2=85, d=0.35, v=0.35, harm=8, buzz=12)]),
                            lambda: note([dict(kind="noise", harm=600, d=0.3, v=0.18, r=0.15)])],
    "rover_stuck": [lambda: note([dict(kind="saw", f=120, f2=70, d=0.4, v=0.3, harm=14, buzz=9)]),
                    lambda: note([dict(kind="sine", f=300, d=0.1, v=0.2)]),
                    lambda: note([dict(kind="sine", f=240, d=0.14, v=0.2)])],
    "rover_scout": [lambda: note([dict(kind="sine", f=600, f2=1400, d=0.35, v=0.2, a=0.15)]),
                    lambda: note([dict(kind="noise", harm=5000, d=0.3, v=0.06, a=0.15)])],
    "rover_beacon": [lambda: note([dict(kind="sine", f=500, f2=150, d=0.12, v=0.35)]),
                     lambda: note([dict(kind="sq", f=300, d=0.06, v=0.2, harm=9)]),
                     lambda: note([dict(kind="sine", f=1500, d=0.06, v=0.2)])],
    "rover_arrive": [lambda: seq([dict(kind="tri", f=659, d=0.09, v=0.28, harm=9), dict(kind="tri", f=880, d=0.09, v=0.28, harm=9), dict(kind="tri", f=1174, d=0.2, v=0.32, harm=9)], gap=0.02)],
    "rover_towed": [lambda: note([dict(kind="sq", f=150, d=0.5, v=0.2, harm=7, buzz=7)]),
                    lambda: note([dict(kind="sine", f=440, f2=660, d=0.2, v=0.22)])],
    "beacon_ping": [lambda: note([dict(kind="sine", f=1244, d=0.1, v=0.25, r=0.08)]),
                    lambda: note([dict(kind="sine", f=1650, d=0.1, v=0.2, r=0.08)])],
    "beacon_activate": [lambda: note([dict(kind="saw", f=200, f2=1600, d=1.6, v=0.28, harm=16, a=0.8)]),
                        lambda: note([dict(kind="sine", f=1568, d=0.3, v=0.2, a=0.2)]),
                        lambda: note([dict(kind="sine", f=2093, d=0.3, v=0.16, a=0.3)])],
    "ares_landing": [lambda: note([dict(kind="sine", f=40, f2=90, d=2.2, v=0.4, a=1.4, r=0.6)]),
                     lambda: note([dict(kind="noise", harm=500, d=2.0, v=0.2, a=1.5)]),
                     lambda: note([dict(kind="sine", f=70, d=0.3, v=0.4, r=0.2)])],
    "low_points": [lambda: note([dict(kind="sq", f=440, d=0.09, v=0.22, harm=7)]),
                   lambda: note([dict(kind="sq", f=440, d=0.09, v=0.22, harm=7)])],
    # ---- sleep / wake ----
    "sleep_chime": [lambda: note([dict(kind="sine", f=880, d=0.25, v=0.22, r=0.2)]),
                    lambda: note([dict(kind="sine", f=698, d=0.3, v=0.2, r=0.25)]),
                    lambda: note([dict(kind="sine", f=523, d=0.5, v=0.2, r=0.4)])],
    "wake_chime": [lambda: note([dict(kind="sine", f=523, d=0.2, v=0.2, r=0.15)]),
                   lambda: note([dict(kind="sine", f=784, d=0.35, v=0.22, r=0.25)])],
    # ---- intro sting ----
    "intro_sting": [lambda: seq([dict(kind="sq", f=392, d=0.13, v=0.3, harm=17), dict(kind="sq", f=523, d=0.13, v=0.3, harm=17), dict(kind="sq", f=784, d=0.13, v=0.32, harm=17), dict(kind="sq", f=1047, d=0.45, v=0.35, harm=17), dict(kind="saw", f=1319, d=0.6, v=0.2, harm=20, r=0.5)], gap=0.02)],
    "ending_legendary": [lambda: seq([dict(kind="sq", f=523, d=0.11, v=0.3, harm=15), dict(kind="sq", f=659, d=0.11, v=0.3, harm=15), dict(kind="sq", f=784, d=0.11, v=0.3, harm=15), dict(kind="sq", f=1047, d=0.22, v=0.32, harm=15), dict(kind="sq", f=1319, d=0.22, v=0.3, harm=15), dict(kind="tri", f=1568, d=0.5, v=0.34, harm=9), dict(kind="sine", f=1047, d=0.5, v=0.2)], gap=0.02)],
    "ending_cautious": [lambda: seq([dict(kind="tri", f=659, d=0.16, v=0.28, harm=9), dict(kind="tri", f=784, d=0.16, v=0.28, harm=9), dict(kind="tri", f=988, d=0.3, v=0.3, harm=9), dict(kind="sine", f=1319, d=0.4, v=0.2)], gap=0.03)],
    "ending_emergency": [lambda: seq([dict(kind="sine", f=392, d=0.3, v=0.25, r=0.2), dict(kind="sine", f=494, d=0.3, v=0.25, r=0.2), dict(kind="sine", f=659, d=0.7, v=0.3, r=0.5)], gap=0.05)],
}

# ---- seamless loops (rendered long then crossfade-looped to target length) ----
def loop_wind(L=8.0):
    n = int(L * SR)
    x = np.random.randn(n + SR)
    x = lp(x, 650)
    x = lp(x, 650)
    lfo = 0.5 + 0.5 * np.sin(2 * np.pi * 0.13 * np.arange(n) / SR) * np.sin(2 * np.pi * 0.047 * np.arange(n) / SR + 1.3)
    x = x[:n] * (0.35 + 0.65 * lfo)
    x = fade_loop(x, SR // 4)
    return x * 0.5

def loop_habitat(L=8.0):
    ts = np.arange(int(L * SR)) / SR
    base = 0.5 * np.sin(2 * np.pi * 50 * ts) + 0.18 * np.sin(2 * np.pi * 100 * ts) + 0.06 * np.sin(2 * np.pi * 150 * ts)
    hiss = lp(np.random.randn(len(ts)), 900) * 0.05
    trem = 1 + 0.15 * np.sin(2 * np.pi * 0.2 * ts)
    return fade_loop((base * trem + hiss) * 0.5, SR // 2)

def loop_greenhouse(L=8.0):
    ts = np.arange(int(L * SR)) / SR
    air = lp(np.random.randn(len(ts)), 2400) * (0.10 + 0.03 * np.sin(2 * np.pi * 0.07 * ts))
    leaves = np.random.randn(len(ts)) * (np.random.rand(len(ts)) < 0.0002)
    leaves = lp(conv(leaves * 0.25, np.hanning(40)), 5000) * 0.5
    return fade_loop(air + leaves, SR // 2)

def loop_static(L=4.0):
    ts = np.arange(int(L * SR)) / SR
    x = np.random.randn(len(ts))
    x = bp(x, 1200, 400) + 0.3 * bp(x, 3000, 900)
    x *= 0.8 + 0.2 * np.sin(2 * np.pi * 3.1 * ts)
    return fade_loop(x * 0.25, SR // 3)

def loop_solar(L=8.0):
    ts = np.arange(int(L * SR)) / SR
    ph = 2 * np.pi * (90 * ts + 4 * np.sin(2 * np.pi * 0.3 * ts))
    x = 0.4 * np.sin(ph) + 0.15 * np.sin(2 * ph) + 0.05 * np.sin(3 * ph)
    x += lp(np.random.randn(len(ts)), 400) * 0.04
    return fade_loop(x * 0.4, SR // 2)

def loop_rover(L=4.0):
    ts = np.arange(int(L * SR)) / SR
    motor = sum(np.sin(2 * np.pi * 55 * k * ts) / k for k in (1, 2, 3, 4))
    rumble = lp(np.random.randn(len(ts)), 300) * 0.25
    steps = np.sin(2 * np.pi * 3.5 * ts) * 0.1
    return fade_loop((motor * 0.3 + rumble + steps) * 0.5, SR // 3)

LOOPS = {
    "amb_wind": loop_wind,
    "amb_habitat": loop_habitat,
    "amb_greenhouse": loop_greenhouse,
    "amb_static": loop_static,
    "amb_solar": loop_solar,
    "amb_rover": loop_rover,
}

def main():
    os.makedirs(OUT, exist_ok=True)
    count = 0
    for name, segs in RECIPES.items():
        parts = [s() for s in segs]
        mix = np.concatenate(parts) if len(parts) > 1 else parts[0]
        peak = np.max(np.abs(mix)) or 1
        x = mix / peak * 0.85
        write_wav(os.path.join(OUT, name + ".wav"), x)
        count += 1
    for name, fn in LOOPS.items():
        x = fn()
        peak = np.max(np.abs(x)) or 1
        write_wav(os.path.join(OUT, name + ".wav"), x / peak * 0.6)
        count += 1
    print(f"synthesised {count} sfx -> {OUT}")

if __name__ == "__main__":
    main()
