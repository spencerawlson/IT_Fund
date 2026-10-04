import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { COURSES, courseHref } from '@/data/catalog';
import useDocumentTitle from '@/hooks/useDocumentTitle';

/**
 * Old per-track map (/academy/:trackId). Every track is wrapped by exactly one course, and the
 * course page now shows the same lessons (plus the track's free resources), so this route
 * forwards there instead of keeping a second, differently styled view of the same content.
 */
export default function AcademyTrack() {
  useDocumentTitle('Track · Road to CISSP');
  const { trackId } = useParams();
  const course = COURSES.find((c) => c.trackId === trackId);
  return <Navigate to={course ? courseHref(course) : '/academy/courses'} replace />;
}
