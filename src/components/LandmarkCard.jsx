
import React from 'react';
import { motion } from 'framer-motion';
import { Check, Clock3, MapPin, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const LandmarkCard = ({
  // Showcase Mode Props (from landmarks.js)
  id, number, image, city, name, curiosity, description,
  // Selection Mode Props (from Step4Attractions.jsx)
  landmark, destination, isSelected, onToggle, index = 0
}) => {
  // Determine the mode: if onToggle exists, it's used in the Guide Creator (Selection Mode)
  const isSelectionMode = !!onToggle;

  // Normalize the data based on the mode
  const data = isSelectionMode ? landmark : { id, number, image, city, name, curiosity, description };
  const displayCity = isSelectionMode ? (destination?.city || data.city) : data.city;
  const photoAttribution = data.image_attributions?.find?.(
    (attribution) => attribution.display_name || attribution.uri
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      onClick={() => isSelectionMode && onToggle(data.id)}
      className={cn(
        "group relative rounded-3xl overflow-hidden transition-all duration-300 border bg-card dark:bg-slate-800 flex flex-col h-full",
        isSelectionMode ? "cursor-pointer" : "cursor-default",
        isSelected
          ? "border-primary shadow-[0_8px_30px_rgb(241,97,59,0.15)] scale-[1.02]"
          : "border-border/60 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-primary/30"
      )}
    >
      {/* Top Image Header */}
      <div className="relative w-full h-56 overflow-hidden bg-muted">
        {data.image ? (
          <img
            src={data.image}
            alt={data.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-secondary/10">
            <MapPin className="w-12 h-12 text-secondary/30" />
          </div>
        )}

        {/* Subtle gradient overlay for better text contrast if we had text, and depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {photoAttribution && (
          <div className="absolute left-3 bottom-3 z-10 max-w-[calc(100%-1.5rem)] rounded-full bg-black/55 backdrop-blur-sm px-3 py-1 text-[10px] font-medium text-white/90">
            Foto:{' '}
            {photoAttribution.uri ? (
              <a
                href={photoAttribution.uri}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="underline decoration-white/50 underline-offset-2"
              >
                {photoAttribution.display_name || 'Google Places'}
              </a>
            ) : (
              <span>{photoAttribution.display_name}</span>
            )}
          </div>
        )}

        {/* Number Badge (Showcase Mode) */}
        {!isSelectionMode && data.number && (
          <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg shadow-lg z-10">
            {data.number}
          </div>
        )}

        {/* Checkbox Indicator (Selection Mode) */}
        {isSelectionMode && (
          <div className="absolute top-4 right-4 z-10">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm border-2",
              isSelected
                ? "bg-primary border-primary text-white scale-110"
                : "bg-background/80 backdrop-blur-sm border-muted text-transparent group-hover:border-primary/50"
            )}>
              <Check className={cn("w-4 h-4 transition-opacity", isSelected ? "opacity-100" : "opacity-0")} />
            </div>
          </div>
        )}
      </div>

      <div className="p-6 flex flex-col flex-1">
        {/* City & Location */}
        <div className="mb-2">
          <span className="text-primary text-xs font-bold tracking-widest uppercase flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            {displayCity}
          </span>
        </div>

        {/* Title */}
        <h4 className="text-2xl font-serif font-bold text-secondary dark:text-secondary-foreground mb-4 leading-tight group-hover:text-primary transition-colors">
          {data.name}
        </h4>

        {/* Curiosity / Fun Fact (Showcase Mode) */}
        {data.curiosity && (
          <div className="mb-4 p-3 bg-muted/50 dark:bg-slate-900/50 rounded-xl border-l-4 border-accent">
            <p className="text-sm italic text-muted-foreground font-medium">
              "{data.curiosity}"
            </p>
          </div>
        )}

        {/* Description */}
        <p className="text-foreground/80 dark:text-gray-300 text-sm leading-relaxed mb-6 flex-1">
          {data.description || 'Um ponto turístico imperdível para sua viagem em família.'}
        </p>

        {isSelectionMode && (data.duration_minutes || data.match_reasons?.length > 0) && (
          <div className="space-y-3 mb-5">
            {data.duration_minutes && (
              <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                <Clock3 className="w-4 h-4 text-secondary" />
                {data.duration_minutes} min
              </div>
            )}

            {data.match_reasons?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.match_reasons.slice(0, 2).map((reason) => (
                  <Badge key={reason} variant="outline" className="rounded-full bg-primary/5 text-primary border-primary/20">
                    {reason}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {isSelectionMode && data.family_tip && (
          <div className="mb-5 rounded-2xl bg-accent/10 border border-accent/20 p-3 flex gap-2">
            <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed font-medium text-foreground/80">
              {data.family_tip}
            </p>
          </div>
        )}

        {/* Confidence Score Badge (Selection Mode) */}
        {isSelectionMode && data.confidence !== undefined && (
          <div className="mt-auto flex items-center">
            <div className={cn("px-3 py-1.5 rounded-full text-xs font-bold tracking-wide flex items-center gap-1.5",
              data.confidence >= 0.8 ? "bg-accent/20 text-accent-foreground" :
              data.confidence >= 0.5 ? "bg-secondary/20 text-secondary-foreground" :
              "bg-muted text-muted-foreground"
            )}>
              <div className={cn("w-1.5 h-1.5 rounded-full",
                data.confidence >= 0.8 ? "bg-accent-foreground" :
                data.confidence >= 0.5 ? "bg-secondary-foreground" : "bg-current"
              )} />
              {data.confidence >= 0.8 ? 'Alta Compatibilidade' :
               data.confidence >= 0.5 ? 'Boa Opção' : 'Sugerido'}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default LandmarkCard;
