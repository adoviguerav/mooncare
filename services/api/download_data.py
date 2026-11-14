"""Downloads the raw datasets once, during setup. The app itself never uses the network.

The datasets and their links are described in docs/parameters_and_datasets.md.
"""

import logging
import shutil
import urllib.request
import zipfile
from datetime import date
from pathlib import Path

from app.config import LIFESNAPS_DIR, METABOLIC_PANEL_CSV, NASA_DIR

OSDR_URL = "https://nasa-osdr.s3.us-west-2.amazonaws.com"

NASA_FILES = {
    METABOLIC_PANEL_CSV: f"{OSDR_URL}/OSD-575/version-3/Comprehensive_Metabolic_Panel/"
    "LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv",
    NASA_DIR / "blood_count.csv": f"{OSDR_URL}/OSD-569/version-4/Complete_Blood_Count/"
    "LSDS-7_Complete_Blood_Count_CBC_TRANSFORMED.csv",
    NASA_DIR / "cardiovascular_panel.csv": f"{OSDR_URL}/OSD-575/version-3/Multiplex/"
    "LSDS-8_Multiplex_serum_cardiovascular_EvePanel_TRANSFORMED.csv",
    NASA_DIR / "immune_panel_eve.csv": f"{OSDR_URL}/OSD-575/version-3/Multiplex/"
    "LSDS-8_Multiplex_serum_immune_EvePanel_TRANSFORMED.csv",
    NASA_DIR / "immune_panel_alamar.csv": f"{OSDR_URL}/OSD-575/version-3/Multiplex/"
    "LSDS-8_Multiplex_serum.immune.AlamarPanel_TRANSFORMED.csv",
}

RADLAB_URL = (
    "https://visualization.osdr.nasa.gov/radlab/api/?spacecraft=ISS"
    "&timestamp%3E={start}T00:00&timestamp%3C{end}T00:00"
    "&absorbed_dose_rate&dose_equivalent_rate&instrument&module&format=tsv"
)
# The months the other datasets cover: LifeSnaps starts in May 2021, the last blood draw is in March 2022.
RADLAB_FIRST_MONTH = date(2021, 5, 1)
RADLAB_LAST_MONTH = date(2022, 3, 1)

LIFESNAPS_ZIP_URL = "https://zenodo.org/records/7229547/files/rais_anonymized.zip"
LIFESNAPS_ZIP_MEMBERS = (
    "rais_anonymized/csv_rais_anonymized/daily_fitbit_sema_df_unprocessed.csv",
    "rais_anonymized/csv_rais_anonymized/hourly_fitbit_sema_df_unprocessed.csv",
    "rais_anonymized/scored_surveys/stai.csv",
    "rais_anonymized/scored_surveys/panas.csv",
)

log = logging.getLogger("download_data")


def download_file(url: str, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    partial = destination.with_name(destination.name + ".part")
    with urllib.request.urlopen(url) as response, partial.open("wb") as partial_file:
        shutil.copyfileobj(response, partial_file)
    partial.replace(destination)


def download_nasa_files() -> None:
    for destination, url in NASA_FILES.items():
        if destination.exists():
            log.info("%s already downloaded", destination.name)
            continue
        log.info("Downloading %s", destination.name)
        download_file(url, destination)


def get_next_month(month: date) -> date:
    return date(month.year + month.month // 12, month.month % 12 + 1, 1)


def download_radlab() -> None:
    month = RADLAB_FIRST_MONTH
    while month <= RADLAB_LAST_MONTH:
        next_month = get_next_month(month)
        destination = NASA_DIR / "radlab" / f"iss_{month:%Y-%m}.tsv"
        if destination.exists():
            log.info("%s already downloaded", destination.name)
        else:
            log.info("Downloading %s", destination.name)
            download_file(RADLAB_URL.format(start=month.isoformat(), end=next_month.isoformat()), destination)
        month = next_month


def download_lifesnaps() -> None:
    wanted_files = {LIFESNAPS_DIR / Path(member).name: member for member in LIFESNAPS_ZIP_MEMBERS}
    if all(csv_file.exists() for csv_file in wanted_files):
        log.info("LifeSnaps files already downloaded")
        return
    zip_path = LIFESNAPS_DIR / "rais_anonymized.zip"
    log.info("Downloading the LifeSnaps zip (615 MB), this takes a few minutes")
    download_file(LIFESNAPS_ZIP_URL, zip_path)
    with zipfile.ZipFile(zip_path) as archive:
        for csv_file, member in wanted_files.items():
            with archive.open(member) as zipped, csv_file.open("wb") as extracted:
                shutil.copyfileobj(zipped, extracted)
    zip_path.unlink()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    download_nasa_files()
    download_radlab()
    download_lifesnaps()
    log.info("Datasets ready")
