#!/usr/bin/env bash
# Envoie une notification d'exemple au simulateur iOS pour contrôler les cartes de l'extension
# `targets/hub-sale-content` (vente, opportunité, déploiement) sur plusieurs tailles d'iPhone.
#
# Usage : scripts/notification-samples/push.sh [sale|opportunity|deployment|all] [appareil] [bundle]
#   appareil : UDID ou « booted » (défaut)
#   bundle   : identifiant de l'app installée (défaut : fr.batipower.hub.dev, variante de développement)
#
# Mode d'emploi du contrôle visuel :
#   1. Lancer un simulateur par taille : iPhone SE (3e gén.) = 320 pt, iPhone 13 mini = 375 pt,
#      iPhone 15 Pro = 393 pt, iPhone 15 Pro Max = 430 pt, avec l'app de développement installée
#      et les notifications autorisées.
#   2. Envoyer une notification, puis tirer la bannière vers le bas (ou appui long) pour ouvrir la carte.
#   3. Capturer : xcrun simctl io <appareil> screenshot avant-<taille>-<carte>.png
#
# Le simulateur n'exécute pas l'extension de service : la vignette du produit reste donc vide ici.
set -euo pipefail

cd "$(dirname "$0")"

which="${1:-all}"
device="${2:-booted}"
bundle="${3:-fr.batipower.hub.dev}"

case "$which" in
  sale | opportunity | deployment) cards=("$which") ;;
  all) cards=(sale opportunity deployment) ;;
  *)
    echo "Carte inconnue : $which (sale, opportunity, deployment ou all)" >&2
    exit 1
    ;;
esac

for card in "${cards[@]}"; do
  echo "→ $card sur $device ($bundle)"
  xcrun simctl push "$device" "$bundle" "$card.apns"
done
