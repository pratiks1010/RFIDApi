import React, { useState } from 'react';
import { Box, Button, Typography, Paper, LinearProgress, Alert } from '@mui/material';
import axios from 'axios';
import { useNotifications } from '../context/NotificationContext';
import BackToProfileMenu from './common/BackToProfileMenu';
import { toRrgoldApiUrl } from '../services/apiBaseConfig';

const SingleUseTags = () => {
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [success, setSuccess] = useState(false);
    const { addNotification } = useNotifications();

    const handleUpdate = async () => {
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            const clientCode = userInfo.ClientCode;

            if (!clientCode) {
                addNotification({
                    title: 'Error',
                    description: 'Client Code not found in session.',
                    type: 'error'
                });
                return;
            }

            setLoading(true);
            setProgress(0);
            setSuccess(false);

            // Simulate progress while request is pending
            const progressInterval = setInterval(() => {
                setProgress((oldProgress) => {
                    if (oldProgress === 100) {
                        return 100;
                    }
                    const diff = Math.random() * 10;
                    return Math.min(oldProgress + diff, 90);
                });
            }, 500);

            const response = await axios.post(
                toRrgoldApiUrl('/api/ProductMaster/UpdateTIDFromInvertedHexCode'),
                { clientCode },
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            clearInterval(progressInterval);
            setProgress(100);
            setLoading(false);
            setSuccess(true);

            const data = response?.data || {};
            const summary = data.memorySummary || data.MemorySummary;
            const samples = data.samples || data.Samples;
            const extra =
                summary || (Array.isArray(samples) && samples.length)
                    ? ` ${summary ? `Memory: ${typeof summary === 'string' ? summary : JSON.stringify(summary)}.` : ''}${
                        Array.isArray(samples) && samples[0]
                          ? ` Sample: ${samples[0].source || samples[0].Source || ''} → ${samples[0].epcHex || samples[0].EpcHex || ''}`
                          : ''
                      }`
                    : '';

            addNotification({
                title: 'Success',
                description: (data.message || data.Message || 'TID updated successfully from inverted hex code.') + extra,
                type: 'success'
            });

        } catch (error) {
            setLoading(false);
            setProgress(0);
            console.error('Update error:', error);
            addNotification({
                title: 'Error',
                description: error.response?.data?.message || error.response?.data?.Message || error.message || 'Failed to update TID.',
                type: 'error'
            });
        }
    };

    return (
        <Box sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
            <BackToProfileMenu style={{ marginBottom: 24 }} />
            <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
                    Single Use Tag Maintenance
                </Typography>

                <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                    This utility updates the TID from Inverted Hex Code for all products.
                    Please ensure you want to proceed with this operation.
                </Typography>

                {loading && (
                    <Box sx={{ width: '100%', mb: 3 }}>
                        <LinearProgress variant="determinate" value={progress} />
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            Processing... {Math.round(progress)}%
                        </Typography>
                    </Box>
                )}

                {success && (
                    <Alert severity="success" sx={{ mb: 3 }}>
                        Operation completed successfully!
                    </Alert>
                )}

                <Button
                    variant="contained"
                    size="large"
                    color="primary"
                    onClick={handleUpdate}
                    disabled={loading}
                    sx={{
                        minWidth: 200,
                        textTransform: 'none',
                        fontSize: '16px'
                    }}
                >
                    {loading ? 'Updating...' : 'Update TID Now'}
                </Button>
            </Paper>
        </Box>
    );
};

export default SingleUseTags;
