'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';

export type OrgNode = {
  id: string;
  name: string;
  title: string;
  photoUrl: string;
  bio: string;
  children?: OrgNode[];
};

interface OrgChartProps {
  data: OrgNode;
}

export default function OrgChart({ data }: OrgChartProps) {
  const [selectedNode, setSelectedNode] = useState<OrgNode | null>(null);

  const renderNode = (node: OrgNode) => {
    return (
      <li key={node.id}>
        <div 
          onClick={() => setSelectedNode(node)}
          className="inline-block cursor-pointer group"
        >
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md rounded-2xl p-4 w-48 md:w-56 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-blue-500 relative z-10">
            <div className="w-16 h-16 md:w-20 md:h-20 mx-auto rounded-full overflow-hidden mb-3 border-2 border-white dark:border-gray-800 shadow-sm">
              <Image 
                src={node.photoUrl || "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=200&auto=format&fit=crop"} 
                alt={node.name} 
                width={80} 
                height={80} 
                className="object-cover w-full h-full"
              />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white text-sm md:text-base leading-tight mb-1">{node.name}</h3>
            <p className="text-blue-600 dark:text-blue-400 text-xs md:text-sm font-medium">{node.title}</p>
          </div>
        </div>
        {node.children && node.children.length > 0 && (
          <ul>
            {node.children.map(child => renderNode(child))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className="w-full overflow-x-auto pb-10 hide-scrollbar">
      <div className="org-tree min-w-max px-4">
        <ul>
          {renderNode(data)}
        </ul>
      </div>

      {/* Modal Biodata */}
      {selectedNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="relative h-32 bg-blue-600">
              <button 
                onClick={() => setSelectedNode(null)}
                className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="px-8 pb-8 pt-0 text-center relative">
              <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-white dark:border-gray-900 shadow-lg -mt-16 bg-white mb-4">
                <Image 
                  src={selectedNode.photoUrl || "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=400&auto=format&fit=crop"} 
                  alt={selectedNode.name} 
                  width={128} 
                  height={128} 
                  className="object-cover w-full h-full"
                />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{selectedNode.name}</h2>
              <p className="text-blue-600 font-semibold mb-6">{selectedNode.title}</p>
              
              <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 text-left border border-gray-100 dark:border-gray-700">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2 uppercase tracking-wider">Biodata & Profil</h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {selectedNode.bio || "Belum ada informasi biodata yang ditambahkan."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
