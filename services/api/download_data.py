"""Downloads the raw datasets once, during setup. The app itself never uses the network."""

import logging
import shutil
import urllib.request
import zipfile
from pathlib import Path

from app.config import LIFESNAPS_DAILY_CSV, LIFESNAPS_HOURLY_CSV, METABOLIC_PANEL_CSV

METABOLIC_PANEL_URL = (
    "https://nasa-osdr.s3.us-west-2.amazonaws.com/OSD-575/version-3/"
    "Comprehensive_Metabolic_Panel/LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv"
)
LIFESNAPS_ZIP_URL = "https://zenodo.org/records/7229547/files/rais_anonymized.zip"
LIFESNAPS_ZIP_FOLDER = "rais_anonymized/csv_rais_anonymized/"

log = logging.getLogger("download_data")


def download_file(url: str, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    partial = destination.with_name(destination.name + ".part")
    with urllib.request.urlopen(url) as response, partial.open("wb") as partial_file:
        shutil.copyfileobj(response, partial_file)
    partial.replace(destination)


def download_metabolic_panel() -> None:
    if METABOLIC_PANEL_CSV.exists():
        log.info("Metabolic panel already downloaded")
        return
    log.info("Downloading the Inspiration4 metabolic panel")
    download_file(METABOLIC_PANEL_URL, METABOLIC_PANEL_CSV)


def download_lifesnaps() -> None:
    wanted_files = (LIFESNAPS_DAILY_CSV, LIFESNAPS_HOURLY_CSV)
    if all(csv_file.exists() for csv_file in wanted_files):
        log.info("LifeSnaps files already downloaded")
        return
    zip_path = LIFESNAPS_DAILY_CSV.parent / "rais_anonymized.zip"
    log.info("Downloading the LifeSnaps zip (615 MB), this takes a few minutes")
    download_file(LIFESNAPS_ZIP_URL, zip_path)
    with zipfile.ZipFile(zip_path) as archive:
        for csv_file in wanted_files:
            with archive.open(LIFESNAPS_ZIP_FOLDER + csv_file.name) as member:
                with csv_file.open("wb") as extracted:
                    shutil.copyfileobj(member, extracted)
    zip_path.unlink()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    download_metabolic_panel()
    download_lifesnaps()
    log.info("Datasets ready")
