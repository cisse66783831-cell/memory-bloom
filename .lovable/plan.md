
# Plan de traduction en français et suggestions de fonctionnalités

## Traduction en français

### Fichiers à modifier

#### 1. `index.html`
- Titre : "MemoryRestore - Restauration de photos anciennes"
- Description : "Redonnez vie à vos souvenirs"

#### 2. `src/components/Header.tsx`
- Logo/Nom : "MemoryRestore" ou "SouvenirRestaure"

#### 3. `src/components/PhotoUploader.tsx`
| Anglais | Français |
|---------|----------|
| "Bring Your Memories Back to Life" | "Redonnez Vie à Vos Souvenirs" |
| "Old, damaged or blurry photos accepted. We'll restore the magic." | "Photos anciennes, abîmées ou floues acceptées. Nous restaurons la magie." |
| "Drop your photo here" | "Déposez votre photo ici" |
| "or click to browse" | "ou cliquez pour parcourir" |
| "JPG or PNG accepted" | "JPG ou PNG acceptés" |
| "Photo ready" | "Photo prête" |
| "Private & Secure" | "Privé et Sécurisé" |
| "Quick Processing" | "Traitement Rapide" |

#### 4. `src/components/ProcessingLoader.tsx`
| Anglais | Français |
|---------|----------|
| "Restoring Your Memory..." | "Restauration de Votre Souvenir..." |
| "We're carefully bringing back every detail." | "Nous restaurons chaque détail avec soin." |
| "Analyzing your photo..." | "Analyse de votre photo..." |
| "Enhancing details..." | "Amélioration des détails..." |
| "Restoring colors..." | "Restauration des couleurs..." |
| "Almost there..." | "Presque terminé..." |
| "Every photograph is a story preserved in time." | "Chaque photo est une histoire préservée dans le temps." |

#### 5. `src/components/BeforeAfterSlider.tsx`
| Anglais | Français |
|---------|----------|
| "Slide to see the difference" | "Glissez pour voir la différence" |
| "Before" | "Avant" |
| "After" | "Après" |
| "PREVIEW" | "APERÇU" |

#### 6. `src/components/PaymentSection.tsx`
| Anglais | Français |
|---------|----------|
| "Your memory is ready" | "Votre souvenir est prêt" |
| "Unlock the Full Version" | "Débloquez la Version Complète" |
| "High-resolution PNG (no watermark)" | "PNG haute résolution (sans filigrane)" |
| "Print-ready PDF" | "PDF prêt à imprimer" |
| "Instant download after payment" | "Téléchargement instantané après paiement" |
| "Unlock Now – 1000 F" | "Débloquer Maintenant – 1000 F" |
| "Processing..." | "Traitement en cours..." |
| "Secure payment • Instant access" | "Paiement sécurisé • Accès instantané" |

#### 7. `src/components/SuccessDownload.tsx`
| Anglais | Français |
|---------|----------|
| "Your Memory is Ready" | "Votre Souvenir est Prêt" |
| "Thank you for preserving this precious moment." | "Merci de préserver ce précieux moment." |
| "Download HD PNG" | "Télécharger PNG HD" |
| "Download Print PDF" | "Télécharger PDF Impression" |
| "Make this a framed print" | "Transformez-le en cadre" |

#### 8. `src/components/UpsellSection.tsx`
| Anglais | Français |
|---------|----------|
| "Turn This Memory Into Art" | "Transformez Ce Souvenir en Œuvre d'Art" |
| "Premium canvas prints, delivered to your door." | "Impressions sur toile premium, livrées chez vous." |
| "Most Popular" | "Le Plus Populaire" |
| "Premium canvas" | "Toile premium" |
| "Ready to hang" | "Prêt à accrocher" |
| "No thanks, I'm happy with my download" | "Non merci, je suis satisfait de mon téléchargement" |

#### 9. `src/pages/Index.tsx`
| Anglais | Français |
|---------|----------|
| "See the Transformation" | "Voyez la Transformation" |
| "Your memory, restored with care." | "Votre souvenir, restauré avec soin." |
| "Payment successful!" | "Paiement réussi !" |
| "Your restored photo is ready for download." | "Votre photo restaurée est prête à télécharger." |
| "Download started" | "Téléchargement démarré" |
| "Your HD PNG is downloading..." | "Votre PNG HD est en cours de téléchargement..." |
| "Your print-ready PDF is downloading..." | "Votre PDF prêt à imprimer est en cours de téléchargement..." |
| "Great choice!" | "Excellent choix !" |
| "added to cart" | "ajouté au panier" |
| "Thank you!" | "Merci !" |
| "Enjoy your restored memory." | "Profitez de votre souvenir restauré." |
| "Something went wrong" | "Une erreur s'est produite" |
| Footer: "© 2026 MemoryRestore. Preserving your precious moments." | "© 2026 MemoryRestore. Préservons vos précieux souvenirs." |

---

## Suggestions de Fonctionnalités

### 1. Historique des restaurations
Permettre aux utilisateurs de créer un compte et retrouver leurs photos restaurées plus tard. Inclut une page "Mes restaurations" avec toutes les photos passées.

### 2. Partage sur les réseaux sociaux
Ajouter des boutons de partage (Facebook, Instagram, WhatsApp) après le téléchargement pour partager facilement le résultat de la restauration.

### 3. Colorisation automatique
Option pour coloriser automatiquement les photos noir et blanc anciennes, en plus de la restauration standard.

### 4. Plusieurs styles de restauration
Proposer différents styles : restauration naturelle, légèrement améliorée, ou artistique/vintage.

### 5. Système de parrainage
Offrir une réduction (ex: 500 F) quand un utilisateur invite un ami qui effectue un achat.

### 6. Galerie d'exemples avant/après
Ajouter une section sur la page d'accueil montrant des exemples de restaurations réussies pour convaincre les nouveaux visiteurs.

### 7. Mode batch (plusieurs photos)
Permettre l'upload de plusieurs photos à la fois avec un prix dégressif (ex: 3 photos pour 2500 F).

### 8. Notifications par email
Envoyer un email avec le lien de téléchargement après paiement pour que l'utilisateur puisse récupérer sa photo plus tard.

---

## Détails techniques

### Approche recommandée
Modifier directement les chaînes de caractères dans chaque composant. Pour une future internationalisation (multi-langues), on pourrait implémenter un système i18n avec `react-i18next`.

### Estimation
- Traduction : modification de 8 fichiers
- Temps de mise en œuvre : rapide (remplacement de textes)
