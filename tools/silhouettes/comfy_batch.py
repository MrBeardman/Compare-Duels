"""Batch-generate silhouette source renders with local ComfyUI (Krea 2 Turbo, no LoRAs), then trace them.
usage: python comfy_batch.py <items.json> [seeds=4] [--no-trace]
items.json: [{"id": "dining-chair", "subject": "a wooden dining chair", "view": "side view"}, ...]
Outputs land in C:\\Data\\AI\\output\\compare-duels\\ (ComfyUI) and are copied to raw/<id>-<n>.png, traced to out/.
"""
import json, sys, time, uuid, shutil, subprocess, zlib, urllib.request, urllib.error
from pathlib import Path

COMFY = "http://127.0.0.1:8188"
OUT_DIR = Path(r"C:\Data\AI\output\compare-duels")
HERE = Path(__file__).parent
RAW, OUT = HERE / "raw", HERE / "out"
RAW.mkdir(exist_ok=True); OUT.mkdir(exist_ok=True); OUT_DIR.mkdir(parents=True, exist_ok=True)

PROMPT = ("strict orthographic {view} of {subject}, the entire object fully visible and centred, "
          "flat matte dark grey, on a pure white seamless background, no shadow, no ground, no reflection, "
          "no text, technical reference illustration, even diffuse lighting")

def graph(prompt: str, seed: int, prefix: str) -> dict:
    return {
        "10": {"class_type": "UNETLoader", "inputs": {"unet_name": "krea2_turbo_int8_convrot.safetensors", "weight_dtype": "default"}},
        "11": {"class_type": "CLIPLoader", "inputs": {"clip_name": "qwen3vl_4b_fp8_scaled.safetensors", "type": "krea2", "device": "default"}},
        "12": {"class_type": "VAELoader", "inputs": {"vae_name": "qwen_image_vae.safetensors"}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"text": prompt, "clip": ["11", 0]}},
        "13": {"class_type": "ConditioningZeroOut", "inputs": {"conditioning": ["6", 0]}},
        "5": {"class_type": "EmptyLatentImage", "inputs": {"width": 1024, "height": 1024, "batch_size": 1}},
        "3": {"class_type": "KSampler", "inputs": {"seed": seed, "steps": 8, "cfg": 1.0, "sampler_name": "euler", "scheduler": "simple",
              "denoise": 1.0, "model": ["10", 0], "positive": ["6", 0], "negative": ["13", 0], "latent_image": ["5", 0]}},
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["3", 0], "vae": ["12", 0]}},
        "29": {"class_type": "SaveImage", "inputs": {"filename_prefix": prefix, "images": ["8", 0]}},
    }

def api(path: str, body: dict | None = None):
    req = urllib.request.Request(COMFY + path, data=json.dumps(body).encode() if body else None,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode())

def run_one(prompt: str, seed: int, prefix: str) -> Path:
    pid = api("/prompt", {"prompt": graph(prompt, seed, prefix), "client_id": str(uuid.uuid4())})["prompt_id"]
    for _ in range(600):                       # up to ~5 min
        time.sleep(0.5)
        h = api(f"/history/{pid}")
        if pid in h:
            st = h[pid].get("status", {})
            if st.get("status_str") == "error":
                raise RuntimeError(f"ComfyUI error: {json.dumps(st)[:400]}")
            imgs = h[pid]["outputs"]["29"]["images"]
            im = imgs[0]
            return Path(r"C:\Data\AI\output") / im.get("subfolder", "") / im["filename"]
    raise TimeoutError(prefix)

def main():
    items = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    seeds = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2].isdigit() else 4
    do_trace = "--no-trace" not in sys.argv
    t0 = time.time()
    for it in items:
        prompt = PROMPT.format(subject=it["subject"], view=it.get("view", "side view"))
        if it.get("extra"): prompt += ", " + it["extra"]
        for n in range(1, seeds + 1):
            seed = (zlib.crc32(f"{it['id']}:{n}".encode()) & 0x7FFFFFFF) if "seed" not in it else it["seed"] + n
            dst = RAW / f"{it['id']}-{n}.png"
            if not dst.exists():
                src = run_one(prompt, seed, f"compare-duels/{it['id']}-{n}")
                shutil.copy(src, dst)
            if do_trace:
                r = subprocess.run([sys.executable, str(HERE / "trace.py"), str(dst), str(OUT / f"{it['id']}-{n}")],
                                   capture_output=True, text=True)
                print(r.stdout.strip() or r.stderr.strip()[-300:])
        print(f"{it['id']}: {seeds} done  ({time.time() - t0:.0f}s total)", flush=True)

if __name__ == "__main__":
    main()
